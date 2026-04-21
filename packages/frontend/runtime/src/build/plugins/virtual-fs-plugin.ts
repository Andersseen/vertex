import type * as esbuild from 'esbuild-wasm'
import type { IVirtualFS } from '../../types/fs.types'

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.sass']

export function virtualFsPlugin(fs: IVirtualFS): esbuild.Plugin {
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
          return { contents: content, loader }
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
