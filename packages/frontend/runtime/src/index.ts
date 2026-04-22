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

// Build types (no class exports — import Bundler from '@vertex/runtime/build')
export type {
  BuildConfig,
  BuildResult,
  BuildOutputFile,
  BuildError,
  BuildWarning,
  BuildProgressCallback,
  IBundler,
} from './types/build.types'

// Preview types (no class exports — import PreviewManager from '@vertex/runtime/preview')
export type {
  PreviewConfig,
  PreviewSession,
  IPreviewManager,
  SWMessage,
  SWResponse,
} from './types/preview.types'

// Node runtime types (no class exports — import NodeboxRuntime from '@vertex/runtime/node')
export type {
  INodeRuntime,
  NodeRuntimeOptions,
  NpmInstallOptions,
  ScriptRunOptions,
  DevServerInfo,
  TerminalAdapter,
} from './types/node.types'
