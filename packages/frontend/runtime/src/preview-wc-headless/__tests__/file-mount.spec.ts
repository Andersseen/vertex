import { describe, expect, it } from 'bun:test'
import { vfsToFileSystemTree } from '../file-mount'
import type { IVirtualFS, DirEntry } from '../../types/fs.types'

function makeVfs(structure: Record<string, string | Record<string, string>>): IVirtualFS {
  return {
    readDir: async (path: string) => {
      const entries: DirEntry[] = []
      const root = path === '/' ? structure : (structure[path.slice(1)] as Record<string, string>)
      if (!root) return []
      for (const name of Object.keys(root)) {
        const full = path === '/' ? `/${name}` : `${path}/${name}`
        entries.push({
          name,
          path: full,
          type: typeof root[name] === 'string' ? 'file' : 'directory',
        })
      }
      return entries
    },
    readFile: async (path: string) => {
      const parts = path.replace(/^\//, '').split('/')
      if (parts.length === 1) {
        const val = structure[parts[0]]
        if (typeof val === 'string') return val
      }
      if (parts.length === 2) {
        const dir = structure[parts[0]] as Record<string, string>
        if (dir && typeof dir[parts[1]] === 'string') return dir[parts[1]]
      }
      throw new Error(`not found: ${path}`)
    },
    writeFile: async () => {},
    deleteFile: async () => {},
    deleteDirectory: async () => {},
    rename: async () => {},
    exists: async () => false,
    mkdir: async () => {},
    watch: () => () => {},
    clear: async () => {},
  } as IVirtualFS
}

describe('vfsToFileSystemTree', () => {
  it('converts flat files', async () => {
    const vfs = makeVfs({ 'index.ts': 'export {}', 'package.json': '{}' })
    const tree = await vfsToFileSystemTree(vfs)
    expect(tree['index.ts']).toEqual({ file: { contents: 'export {}' } })
    expect(tree['package.json']).toEqual({ file: { contents: '{}' } })
  })

  it('converts nested directories', async () => {
    const vfs = makeVfs({ src: { 'main.ts': 'console.log()' } })
    const tree = await vfsToFileSystemTree(vfs)
    expect('directory' in (tree['src'] as object)).toBe(true)
    const srcNode = tree['src'] as { directory: Record<string, unknown> }
    expect(srcNode.directory['main.ts']).toEqual({ file: { contents: 'console.log()' } })
  })

  it('skips node_modules', async () => {
    const vfs = makeVfs({ node_modules: { react: 'x' }, 'index.ts': 'y' })
    const tree = await vfsToFileSystemTree(vfs)
    expect(tree['node_modules']).toBeUndefined()
    expect(tree['index.ts']).toBeDefined()
  })

  it('skips .git directory', async () => {
    const vfs = makeVfs({ '.git': { config: 'x' }, 'index.ts': 'y' })
    const tree = await vfsToFileSystemTree(vfs)
    expect(tree['.git']).toBeUndefined()
  })
})
