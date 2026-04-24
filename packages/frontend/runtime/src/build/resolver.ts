import type { IVirtualFS } from '../types/fs.types'

export interface PackageJson {
  name?: string
  version?: string
  main?: string
  module?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

export async function readPackageJson(fs: IVirtualFS, dir = '/'): Promise<PackageJson> {
  try {
    const content = await fs.readFile(`${dir}/package.json`.replace('//', '/'))
    return JSON.parse(content)
  } catch {
    return {}
  }
}

export function extractDependencyVersions(pkg: PackageJson): Record<string, string> {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  const versions: Record<string, string> = {}
  for (const [name, version] of Object.entries(deps)) {
    versions[name] = version.replace(/^[\^~>=<!]+/, '').split(' ')[0]
  }
  return versions
}

export function detectFramework(
  pkg: PackageJson
): 'react' | 'vue' | 'angular' | 'svelte' | 'unknown' {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  if (deps['react']) return 'react'
  if (deps['vue']) return 'vue'
  if (deps['@angular/core']) return 'angular'
  if (deps['svelte']) return 'svelte'
  return 'unknown'
}

export function detectEntryPoint(pkg: PackageJson): string {
  return (
    pkg.module ??
    pkg.main ??
    '/src/main.tsx'
  )
}

const HTML_MODULE_SCRIPT_RE = /<script\s+[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*><\/script>/i

/**
 * Read /index.html (or a custom path) and extract the `<script type="module" src>` entry.
 * Vite, Angular CLI, and most modern toolchains declare the canonical entry here.
 * Returns an absolute path rooted at `/` or null if not found.
 */
export async function detectEntryFromIndexHtml(
  fs: IVirtualFS,
  indexPath = '/index.html'
): Promise<string | null> {
  const html = await fs.readFile(indexPath).catch(() => null)
  if (!html) return null
  const match = HTML_MODULE_SCRIPT_RE.exec(html)
  if (!match) return null
  const src = match[1]
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
    return null
  }
  if (src.startsWith('/')) return src
  if (src.startsWith('./')) return '/' + src.slice(2)
  return '/' + src
}

export function isAstroProject(pkg: PackageJson): boolean {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  return Boolean(deps['astro'])
}

/**
 * True for projects whose dev server is the only realistic preview path:
 * Astro, Next.js, SvelteKit, Nuxt, Remix, Qwik. esbuild bundling is not
 * sufficient because they rely on framework-specific file-based routing,
 * SSR, and per-file transforms.
 */
export function needsNodeRuntime(pkg: PackageJson): boolean {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  return Boolean(
    deps['astro'] ||
      deps['next'] ||
      deps['@sveltejs/kit'] ||
      deps['nuxt'] ||
      deps['@remix-run/react'] ||
      deps['@builder.io/qwik']
  )
}

/**
 * Pick a sensible dev script. Most modern toolchains use `dev`; CRA and a few
 * others use `start`. Returns null if the package has neither.
 */
export function detectDevScript(pkg: PackageJson): string | null {
  const scripts = pkg.scripts ?? {}
  if (scripts['dev']) return 'dev'
  if (scripts['start']) return 'start'
  if (scripts['serve']) return 'serve'
  return null
}

export type TailwindVersion = 'v3' | 'v4' | null

/**
 * Detects Tailwind by inspecting deps. v4 ships its own packages
 * (`tailwindcss@^4`, `@tailwindcss/*`); v3 uses just `tailwindcss@^3`.
 */
export function detectTailwindVersion(pkg: PackageJson): TailwindVersion {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  const tw = deps['tailwindcss']
  if (!tw && !deps['@tailwindcss/vite'] && !deps['@tailwindcss/postcss']) {
    return null
  }
  const major =
    (tw && /^[~^]?(\d+)/.exec(tw)?.[1]) ||
    (deps['@tailwindcss/vite'] && /^[~^]?(\d+)/.exec(deps['@tailwindcss/vite'])?.[1]) ||
    (deps['@tailwindcss/postcss'] && /^[~^]?(\d+)/.exec(deps['@tailwindcss/postcss'])?.[1])
  return major === '4' ? 'v4' : 'v3'
}
