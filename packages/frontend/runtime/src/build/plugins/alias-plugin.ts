import type * as esbuild from 'esbuild-wasm'
import type { PathAlias } from '../config-resolver'

export function aliasPlugin(aliases: PathAlias[]): esbuild.Plugin {
  return {
    name: 'vertex-alias',
    setup(build) {
      build.onResolve({ filter: /^[^./]/ }, (args) => {
        for (const { pattern, target } of aliases) {
          // Exact match: "quartz" → "./packages/quartz/src/public-api.ts"
          if (pattern === args.path) {
            const resolved = resolveAliasTarget(target)
            return { path: resolved, namespace: 'vfs' }
          }

          // Wildcard match: "quartz/*" → "./packages/quartz/src/*"
          if (pattern.endsWith('/*')) {
            const prefix = pattern.slice(0, -2)
            if (args.path.startsWith(prefix + '/')) {
              const rest = args.path.slice(prefix.length + 1)
              const mapped = target.endsWith('/*')
                ? target.slice(0, -2) + '/' + rest
                : target + '/' + rest
              const resolved = resolveAliasTarget(mapped)
              return { path: resolved, namespace: 'vfs' }
            }
          }
        }
        return undefined
      })
    },
  }
}

function resolveAliasTarget(target: string): string {
  // If target is already absolute, use it directly
  if (target.startsWith('/')) return target

  // For tsconfig/vite aliases, targets are relative to project root (/).
  if (target.startsWith('./') || target.startsWith('../')) {
    const parts: string[] = []
    const segs = target.split('/')
    for (const seg of segs) {
      if (seg === '..') parts.pop()
      else if (seg !== '.' && seg !== '') parts.push(seg)
    }
    return '/' + parts.join('/')
  }

  return '/' + target
}
