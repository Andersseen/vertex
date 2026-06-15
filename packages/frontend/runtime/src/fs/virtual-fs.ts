import { MemoryFS } from './memory-adapter'
import { OPFSFS } from './opfs-adapter'
import type { IVirtualFS, FileContent, DirEntry, WatchCallback, FSMode } from '../types/fs.types'

export class VirtualFS implements IVirtualFS {
  private adapter: MemoryFS | OPFSFS

  constructor(mode: FSMode = 'opfs', name?: string) {
    this.adapter = mode === 'opfs' ? new OPFSFS(name) : new MemoryFS()
  }

  readFile(path: string): Promise<string> {
    return this.adapter.readFile(path)
  }

  writeFile(path: string, content: FileContent): Promise<void> {
    return this.adapter.writeFile(path, content)
  }

  deleteFile(path: string): Promise<void> {
    return this.adapter.deleteFile(path)
  }

  deleteDirectory(path: string): Promise<void> {
    return this.adapter.deleteDirectory(path)
  }

  rename(oldPath: string, newPath: string): Promise<void> {
    return this.adapter.rename(oldPath, newPath)
  }

  readDir(path: string): Promise<DirEntry[]> {
    return this.adapter.readDir(path)
  }

  exists(path: string): Promise<boolean> {
    return this.adapter.exists(path)
  }

  mkdir(path: string): Promise<void> {
    return this.adapter.mkdir(path)
  }

  watch(path: string, cb: WatchCallback): () => void {
    return this.adapter.watch(path, cb)
  }

  clear(): Promise<void> {
    return this.adapter.clear()
  }

  // Solo disponible en modo OPFS — expone el FS raw para isomorphic-git
  get rawFs(): OPFSFS['rawFs'] {
    if (this.adapter instanceof OPFSFS) return this.adapter.rawFs
    throw new Error('rawFs solo disponible en modo opfs')
  }

  get mode(): FSMode {
    return this.adapter instanceof OPFSFS ? 'opfs' : 'memory'
  }
}
