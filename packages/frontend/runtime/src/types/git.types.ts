export interface GitCloneOptions {
  url: string
  dir?: string
  branch?: string
  depth?: number
  token?: string
  /**
   * CORS proxy used to reach the git host from the browser. When a `token` is
   * supplied for a private repo, that token is sent through this proxy — so for
   * private repos prefer a self-hosted proxy (e.g. `@isomorphic-git/cors-proxy`)
   * over the shared public default. Overrides the GitClient's configured proxy.
   */
  corsProxy?: string
  onProgress?: (phase: string, loaded: number, total: number) => void
}

export interface GitCommitOptions {
  message: string
  author: { name: string; email: string }
  files?: string[]
}

export interface GitStatus {
  modified: string[]
  added: string[]
  deleted: string[]
  untracked: string[]
}

export interface GitLogEntry {
  oid: string
  message: string
  author: { name: string; email: string; timestamp: number }
}

export interface IGitClient {
  clone(options: GitCloneOptions): Promise<void>
  pull(dir: string, token?: string): Promise<void>
  push(dir: string, token: string): Promise<void>
  commit(dir: string, options: GitCommitOptions): Promise<string>
  status(dir: string): Promise<GitStatus>
  log(dir: string, limit?: number): Promise<GitLogEntry[]>
  currentBranch(dir: string): Promise<string>
  listBranches(dir: string): Promise<string[]>
  checkout(dir: string, branch: string): Promise<void>
}
