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

// Preview types.
// WebContainers preview is behind separate subpaths:
//   import { WebContainerRunner }  from '@vertex/runtime/preview-wc-headless'
//   import { WebContainerPreview } from '@vertex/runtime/preview-wc'
export type {
  PreviewConfig,
  PreviewSession,
  IPreviewManager,
} from './types/preview.types'

// Deploy types (no class exports — import DeployManager from '@vertex/runtime/deploy')
export type {
  DeployConfig,
  DeployResult,
  DeployPhase,
  DeployProvider,
  DeployFileMap,
  DeployProgressCallback,
  IDeployAdapter,
} from './types/deploy.types'

// Extras — types only. Class exports live behind subpaths so optional peers
// (typescript, eslint, prettier, postcss, sass) are not pulled into every consumer.
//   import { TypeScriptChecker } from '@vertex/runtime/types-checker'
//   import { ESLintRunner } from '@vertex/runtime/lint'
//   import { PrettierFormatter } from '@vertex/runtime/format'
//   import { PostcssRunner, SassCompiler } from '@vertex/runtime/css'
export type {
  Diagnostic,
  DiagnosticSeverity,
  TypeCheckError,
  LintResult,
  FormatResult,
  CssTransformResult,
  SassCompileResult,
  ITypeScriptChecker,
  IESLintRunner,
  IFormatter,
  ICssProcessor,
  ISassCompiler,
} from './types/extras.types'
