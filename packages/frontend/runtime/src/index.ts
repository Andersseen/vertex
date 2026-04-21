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

// Build
export { Bundler } from './build/bundler'
export { virtualFsPlugin, npmCdnPlugin } from './build/plugins'
export {
  readPackageJson,
  extractDependencyVersions,
  detectFramework,
  detectEntryPoint,
} from './build/resolver'
export { readTsConfig, tsConfigToEsbuildTarget } from './build/typescript'
export type {
  BuildConfig,
  BuildResult,
  BuildOutputFile,
  BuildError,
  BuildWarning,
  BuildProgressCallback,
  IBundler,
} from './types/build.types'
export type { PackageJson } from './build/resolver'
