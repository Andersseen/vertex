import type * as esbuild from 'esbuild-wasm'
import type { IVirtualFS } from '../../types/fs.types'

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.sass']

export interface VirtualFsPluginOptions {
  /** Optional CSS transform applied to .css/.scss/.sass contents before esbuild parses them. */
  cssTransform?: (source: string, path: string) => string
}

export function virtualFsPlugin(
  fs: IVirtualFS,
  options: VirtualFsPluginOptions = {}
): esbuild.Plugin {
  return {
    name: 'vertex-virtual-fs',
    setup(build) {
      build.onResolve({ filter: /^[./]/ }, async (args) => {
        const base = args.importer
          ? args.importer.substring(0, args.importer.lastIndexOf('/'))
          : '/'
        const resolved = resolvePath(base, args.path)
        const withExt = await findWithExtension(fs, resolved)
        if (withExt) return { path: withExt, namespace: 'vfs' }
        return undefined
      })

      build.onLoad({ filter: /.*/, namespace: 'vfs' }, async (args) => {
        const content = await fs.readFile(args.path)
        const ext = args.path.split('.').pop() ?? 'js'
        const loaderMap: Record<string, esbuild.Loader> = {
          ts: 'ts', tsx: 'tsx', js: 'js', jsx: 'jsx',
          json: 'json', css: 'css',
          scss: 'css', sass: 'css',
        }

        const loader = loaderMap[ext]
        if (loader) {
          const transformed =
            (loader === 'css' && options.cssTransform)
              ? options.cssTransform(content, args.path)
              : content
          return { contents: transformed, loader }
        }

        // For unsupported file types (images, fonts, etc.), return empty text
        // so esbuild doesn't crash trying to parse them as JavaScript.
        return { contents: '', loader: 'text' }
      })
    },
  }
}

function resolvePath(base: string, relative: string): string {
  if (relative.startsWith('/')) return relative
  const parts = base.split('/').filter(Boolean)
  for (const segment of relative.split('/')) {
    if (segment === '..') parts.pop()
    else if (segment !== '.') parts.push(segment)
  }
  return '/' + parts.join('/')
}

async function findWithExtension(fs: IVirtualFS, path: string): Promise<string | null> {
  if (await fs.exists(path)) return path
  for (const ext of EXTENSIONS) {
    if (await fs.exists(path + ext)) return path + ext
  }
  for (const ext of EXTENSIONS) {
    if (await fs.exists(path + '/index' + ext)) return path + '/index' + ext
  }
  return null
}

const TAILWIND_DIRECTIVE_LINE_RE = /^\s*@(tailwind|apply|screen|layer|variants|responsive|config)\b.*$/gm
const TAILWIND_IMPORT_RE = /@import\s+["']tailwindcss(?:\/[^"']+)?["'];?/g

/**
 * Replace Tailwind-specific directives with comments so esbuild's CSS parser
 * doesn't reject them. Used in the lib-bundling preview path where the Play
 * CDN runs in the browser and generates utilities from the rendered DOM,
 * making source-time directives unnecessary.
 */
export function stripTailwindDirectives(css: string): string {
  if (!TAILWIND_IMPORT_RE.test(css) && !TAILWIND_DIRECTIVE_LINE_RE.test(css)) {
    return css
  }
  // Reset the lastIndex on the global regexes after the test() above.
  TAILWIND_IMPORT_RE.lastIndex = 0
  TAILWIND_DIRECTIVE_LINE_RE.lastIndex = 0
  return css
    .replace(TAILWIND_IMPORT_RE, '/* tailwindcss: served via CDN at runtime */')
    .replace(TAILWIND_DIRECTIVE_LINE_RE, (line) => `/* stripped: ${line.trim()} */`)
}
