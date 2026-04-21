import type { IVirtualFS } from '../types/fs.types'

export interface PathAlias {
  /** Alias pattern, e.g. "quartz" or "quartz/*" or "@org/lib" */
  pattern: string
  /** Target path, e.g. "./packages/quartz/src/public-api.ts" or "./packages/quartz/src/*" */
  target: string
}

export async function readTsConfigPaths(fs: IVirtualFS, dir = '/'): Promise<PathAlias[]> {
  const aliases: PathAlias[] = []
  for (const file of ['tsconfig.json', 'jsconfig.json']) {
    try {
      const content = await fs.readFile(`${dir}/${file}`.replace('//', '/'))
      const config = JSON.parse(content)
      const paths = config.compilerOptions?.paths as Record<string, string[]> | undefined
      if (!paths) continue
      for (const [pattern, targets] of Object.entries(paths)) {
        const target = targets[0]
        if (target) aliases.push({ pattern, target })
      }
    } catch { /* ignore missing or invalid */ }
  }
  return aliases
}

export async function readViteAliases(fs: IVirtualFS, dir = '/'): Promise<PathAlias[]> {
  const aliases: PathAlias[] = []
  for (const file of ['vite.config.ts', 'vite.config.js', 'vite.config.mts', 'vite.config.mjs']) {
    try {
      const content = await fs.readFile(`${dir}/${file}`.replace('//', '/'))
      // Heuristic: find alias blocks like:
      //   alias: { quartz: resolve(__dirname, 'packages/quartz/src/public-api.ts') }
      //   alias: { '@x': '/abs/path', "y": './rel/path' }
      const blockRegex = /alias\s*:\s*\{([^}]+)\}/gs
      let blockMatch: RegExpExecArray | null
      while ((blockMatch = blockRegex.exec(content)) !== null) {
        const block = blockMatch[1]
        // Match each entry: name → path
        // Supports: 'name': path, "name": path, name: path
        // path can be: resolve(__dirname, 'path'), 'path', "path"
        const entryRegex = /['"]?([^'"\s:]+)['"]?\s*:\s*(?:resolve\s*\(\s*__dirname\s*,\s*)?['"]([^'"]+)['"]/g
        let entryMatch: RegExpExecArray | null
        while ((entryMatch = entryRegex.exec(block)) !== null) {
          const pattern = entryMatch[1]
          let target = entryMatch[2]
          // Vite aliases are relative to project root; prefix with ./ if not absolute
          if (!target.startsWith('/') && !target.startsWith('.')) {
            target = './' + target
          }
          aliases.push({ pattern, target })
        }
      }
    } catch { /* ignore missing or unreadable */ }
  }
  return aliases
}
