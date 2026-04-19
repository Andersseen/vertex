// VirtualFS
export { VirtualFS } from './fs/virtual-fs'
export { MemoryFS } from './fs/memory-adapter'
export { OPFSFS } from './fs/opfs-adapter'
export type {
  IVirtualFS,
  FileContent,
  DirEntry,
  FileEntry,
  WatchCallback,
  FSMode,
} from './types/fs.types'

// Git
export { GitClient } from './git/git-client'
export type {
  IGitClient,
  GitCloneOptions,
  GitCommitOptions,
  GitStatus,
  GitLogEntry,
} from './types/git.types'
