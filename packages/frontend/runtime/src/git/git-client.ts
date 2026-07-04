import git from 'isomorphic-git'
import http from 'isomorphic-git/http/web'
import type { OPFSFS } from '../fs/opfs-adapter'
import type {
  GitCloneOptions,
  GitCommitOptions,
  GitStatus,
  GitLogEntry,
  IGitClient,
} from '../types/git.types'

// Public proxy provided by the isomorphic-git project. Fine for anonymous
// clones of public repos, but it can observe any Authorization header that
// passes through it — so private-repo tokens should use a self-hosted proxy.
const DEFAULT_CORS_PROXY = 'https://cors.isomorphic-git.org'

/** A row of `git.statusMatrix`: `[filepath, head, workdir, stage]`. */
export type StatusMatrixRow = [string, number, number, number]

/**
 * Buckets an isomorphic-git status matrix into modified / added / deleted /
 * untracked. Extracted as a pure function so the classification is unit-testable
 * without a real git repo. The codes follow isomorphic-git's HEAD/WORKDIR/STAGE
 * convention (0 = absent, 1 = unchanged from HEAD, 2 = present/changed).
 */
export function categorizeStatusMatrix(matrix: StatusMatrixRow[]): GitStatus {
  const result: GitStatus = { modified: [], added: [], deleted: [], untracked: [] }

  for (const [filepath, head, workdir, stage] of matrix) {
    if (head === 1 && workdir === 2) result.modified.push(filepath)
    else if (head === 0 && workdir === 2 && stage === 2) result.added.push(filepath)
    else if (head === 1 && workdir === 0) result.deleted.push(filepath)
    else if (head === 0 && workdir === 2 && stage === 0) result.untracked.push(filepath)
  }

  return result
}

export class GitClient implements IGitClient {
  private readonly corsProxy: string

  constructor(private fs: OPFSFS, corsProxy: string = DEFAULT_CORS_PROXY) {
    this.corsProxy = corsProxy
  }

  async clone(options: GitCloneOptions): Promise<void> {
    const { url, dir = '/', branch, depth = 1, token, corsProxy, onProgress } = options
    await git.clone({
      fs: this.fs.rawFs,
      http,
      dir,
      url,
      corsProxy: corsProxy ?? this.corsProxy,
      ref: branch,
      singleBranch: true,
      depth,
      headers: token ? { Authorization: `token ${token}` } : {},
      onProgress: onProgress
        ? ({ phase, loaded, total }) => onProgress(phase, loaded, total ?? 0)
        : undefined,
    })
  }

  async pull(dir: string, token?: string): Promise<void> {
    await git.pull({
      fs: this.fs.rawFs,
      http,
      dir,
      corsProxy: this.corsProxy,
      headers: token ? { Authorization: `token ${token}` } : {},
    })
  }

  async push(dir: string, token: string): Promise<void> {
    await git.push({
      fs: this.fs.rawFs,
      http,
      dir,
      corsProxy: this.corsProxy,
      headers: { Authorization: `token ${token}` },
    })
  }

  async commit(dir: string, options: GitCommitOptions): Promise<string> {
    const { message, author, files } = options
    if (files?.length) {
      for (const file of files) {
        await git.add({ fs: this.fs.rawFs, dir, filepath: file })
      }
    } else {
      await git.add({ fs: this.fs.rawFs, dir, filepath: '.' })
    }
    return git.commit({ fs: this.fs.rawFs, dir, message, author })
  }

  async status(dir: string): Promise<GitStatus> {
    const matrix = await git.statusMatrix({ fs: this.fs.rawFs, dir })
    return categorizeStatusMatrix(matrix as StatusMatrixRow[])
  }

  async log(dir: string, limit = 20): Promise<GitLogEntry[]> {
    const commits = await git.log({ fs: this.fs.rawFs, dir, depth: limit })
    return commits.map(c => ({
      oid: c.oid,
      message: c.commit.message,
      author: {
        name: c.commit.author.name,
        email: c.commit.author.email,
        timestamp: c.commit.author.timestamp,
      },
    }))
  }

  async currentBranch(dir: string): Promise<string> {
    return (await git.currentBranch({ fs: this.fs.rawFs, dir })) ?? 'HEAD'
  }

  async listBranches(dir: string): Promise<string[]> {
    return git.listBranches({ fs: this.fs.rawFs, dir })
  }

  async checkout(dir: string, branch: string): Promise<void> {
    await git.checkout({ fs: this.fs.rawFs, dir, ref: branch })
  }
}
