import type { FileSystemTree, DirectoryNode } from '@webcontainer/api'
import type { IVirtualFS } from '../types/fs.types'

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.turbo',
  '.cache',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.astro',
  '.output',
  '.vercel',
  '.netlify',
])

export async function vfsToFileSystemTree(
  vfs: IVirtualFS,
  dir = '/',
): Promise<FileSystemTree> {
  const tree: FileSystemTree = {}
  const entries = await vfs.readDir(dir)

  for (const entry of entries) {
    if (entry.type === 'directory') {
      if (SKIP_DIRS.has(entry.name)) continue
      const subDir = dir === '/' ? `/${entry.name}` : `${dir}/${entry.name}`
      const subtree = await vfsToFileSystemTree(vfs, subDir)
      const dirNode: DirectoryNode = { directory: subtree }
      tree[entry.name] = dirNode
    } else {
      const filePath = dir === '/' ? `/${entry.name}` : `${dir}/${entry.name}`
      const contents = await vfs.readFile(filePath)
      tree[entry.name] = { file: { contents } }
    }
  }

  return tree
}
