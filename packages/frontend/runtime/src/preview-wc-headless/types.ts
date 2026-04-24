import type { FileSystemTree } from '@webcontainer/api'
import type { IVirtualFS } from '../types/fs.types'

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

export type RunnerPhase =
  | 'boot'
  | 'mount'
  | 'install'
  | 'run'
  | 'dev'
  | 'ready'
  | 'stopped'
  | 'failed'

export interface RunnerLog {
  stream: 'stdout' | 'stderr'
  chunk: string
}

export interface RunnerOptions {
  /** Source files as IVirtualFS (OPFS, MemoryFS, etc.). */
  fs?: IVirtualFS
  /** WebContainer-native file tree — alternative to `fs`. */
  files?: FileSystemTree
  /** Clone a git repo inside the container instead of mounting files. */
  gitClone?: { url: string; branch?: string; token?: string }

  /** Force a specific package manager; defaults to lockfile detection then 'npm'. */
  packageManager?: PackageManager

  /** Extra flags appended to the install command. */
  installFlags?: string[]

  /** Timeout in ms for the dev server to report ready. Default: 60_000. */
  devServerTimeout?: number

  onPhase?: (phase: RunnerPhase, message?: string) => void
  onLog?: (log: RunnerLog) => void
}

export interface DevServer {
  url: string
  port: number
  stop(): Promise<void>
}

export interface RunResult {
  exitCode: number
  durationMs: number
}

export interface ExtractedFiles {
  /** Relative path → binary content. */
  [path: string]: Uint8Array
}
