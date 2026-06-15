export type FileContent = string | Uint8Array

export interface FileEntry {
  path: string
  content: FileContent
  encoding: 'utf8' | 'binary'
  size: number
  lastModified: number
}

export interface DirEntry {
  name: string
  path: string
  type: 'file' | 'directory'
}

export interface WatchCallback {
  (event: 'change' | 'add' | 'delete', path: string): void
}

export interface IVirtualFS {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: FileContent): Promise<void>
  deleteFile(path: string): Promise<void>
  deleteDirectory(path: string): Promise<void>
  rename(oldPath: string, newPath: string): Promise<void>
  readDir(path: string): Promise<DirEntry[]>
  exists(path: string): Promise<boolean>
  mkdir(path: string): Promise<void>
  watch(path: string, cb: WatchCallback): () => void
  clear(): Promise<void>
}

export type FSMode = 'memory' | 'opfs'
