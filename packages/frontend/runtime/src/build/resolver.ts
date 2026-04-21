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
