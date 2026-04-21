import type * as esbuild from 'esbuild-wasm'

interface PkgVersions {
  [name: string]: string
}

const NODE_BUILTINS = new Set([
  'fs', 'path', 'os', 'crypto', 'http', 'https', 'net', 'stream', 'events',
  'util', 'url', 'querystring', 'zlib', 'buffer', 'process', 'child_process',
  'cluster', 'dns', 'dgram', 'readline', 'repl', 'tls', 'tty', 'v8', 'vm',
  'worker_threads', 'perf_hooks', 'async_hooks', 'timers', 'timers/promises',
  'string_decoder', 'punycode', 'domain', 'constants', 'module', 'assert',
  'stream/promises', 'stream/consumers', 'stream/web', 'sys', 'inspector',
  'trace_events', 'diagnostics_channel', 'test', 'node:test', 'node:fs',
  'node:path', 'node:os', 'node:crypto', 'node:http', 'node:https',
])

export function npmCdnPlugin(
  cdnUrl = 'https://esm.sh',
  versions: PkgVersions = {},
  allowList?: string[]
): esbuild.Plugin {
  const cache = new Map<string, string>()
  const allowed = new Set(allowList ?? Object.keys(versions))

  return {
    name: 'vertex-npm-cdn',
    setup(build) {
      build.onResolve({ filter: /^[^./]/ }, (args) => {
        const parts = args.path.split('/')
        const name = parts[0]
        const rest = parts.slice(1)
        const pkg = name.startsWith('@') ? name + '/' + rest.shift() : name

        // Skip Node.js built-ins — they don't exist on CDN
        if (NODE_BUILTINS.has(args.path) || NODE_BUILTINS.has(pkg)) {
          return undefined
        }

        // Only resolve packages that are explicitly allowed (listed in package.json)
        if (!allowed.has(pkg)) {
          return undefined
        }

        const sub = rest.join('/')
        const version = versions[pkg] ? `@${versions[pkg]}` : ''
        const url = `${cdnUrl}/${pkg}${version}${sub ? '/' + sub : ''}`
        return { path: url, namespace: 'cdn-url' }
      })

      build.onResolve({ filter: /.*/, namespace: 'cdn-url' }, (args) => {
        if (args.path.startsWith('http')) return { path: args.path, namespace: 'cdn-url' }
        const base = new URL(args.importer)
        const resolved = new URL(args.path, base).toString()
        return { path: resolved, namespace: 'cdn-url' }
      })

      build.onLoad({ filter: /.*/, namespace: 'cdn-url' }, async (args) => {
        if (cache.has(args.path)) {
          return { contents: cache.get(args.path)!, loader: 'js' }
        }
        const res = await fetch(args.path)
        if (!res.ok) throw new Error(`CDN fetch failed: ${args.path} (${res.status})`)
        const contents = await res.text()
        cache.set(args.path, contents)
        return { contents, loader: 'js' }
      })
    },
  }
}
