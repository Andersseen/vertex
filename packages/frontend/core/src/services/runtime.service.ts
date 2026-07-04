import { Injectable, signal } from '@angular/core';
import { VirtualFS, GitClient, OPFSFS } from '@vertex/runtime';
import type { GitCloneOptions, IVirtualFS } from '@vertex/runtime';
import type { VertexFile, VertexFolder } from '@vertex/types';
import { db } from '../db/vertex.db';
import * as fileTree from './file-tree';

export interface CloneProgress {
  phase: string;
  loaded: number;
  total: number;
  percent: number;
}

const SESSION_VERSION = 1;

@Injectable({ providedIn: 'root' })
export class RuntimeService {
  private opfs: OPFSFS | null = null;
  private virtualFs: VirtualFS | null = null;
  private gitClient: GitClient | null = null;

  readonly isVirtualMode = signal(false);
  readonly isCloning = signal(false);
  readonly cloneProgress = signal<CloneProgress | null>(null);
  readonly cloneError = signal<string | null>(null);
  readonly repoName = signal<string>('');

  get fs(): IVirtualFS | null {
    return this.virtualFs;
  }

  get git(): GitClient | null {
    return this.gitClient;
  }

  async clone(options: GitCloneOptions): Promise<VertexFolder> {
    this.isCloning.set(true);
    this.cloneError.set(null);
    this.cloneProgress.set(null);

    const name = this.extractRepoName(options.url);
    this.repoName.set(name);

    try {
      this.opfs = new OPFSFS(`vertex-repo-${name}`);
      await this.opfs.clear();

      this.virtualFs = new VirtualFS('opfs', `vertex-repo-${name}`);
      this.gitClient = new GitClient(this.opfs);

      await this.gitClient.clone({
        ...options,
        dir: '/',
        onProgress: (phase, loaded, total) => {
          const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
          this.cloneProgress.set({ phase, loaded, total, percent });
        },
      });

      const folder = await fileTree.buildRootFolder(this.opfs, '/', name);
      this.isVirtualMode.set(true);
      await this.saveSession(name, options.url, '/');
      return folder;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Clone failed';
      this.cloneError.set(msg);
      throw err;
    } finally {
      this.isCloning.set(false);
    }
  }

  async readFile(path: string): Promise<string> {
    if (!this.opfs) throw new Error('No virtual FS — clone a repo first');
    return this.opfs.readFile(path);
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.opfs) throw new Error('No virtual FS — clone a repo first');
    return this.opfs.writeFile(path, content);
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.opfs) throw new Error('No virtual FS — clone a repo first');
    return this.opfs.deleteFile(path);
  }

  async createDirectory(path: string): Promise<void> {
    if (!this.opfs) throw new Error('No virtual FS — clone a repo first');
    return this.opfs.mkdir(path);
  }

  async deleteDirectory(path: string): Promise<void> {
    if (!this.opfs) throw new Error('No virtual FS — clone a repo first');
    return this.opfs.deleteDirectory(path);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    if (!this.opfs) throw new Error('No virtual FS — clone a repo first');
    return this.opfs.rename(oldPath, newPath);
  }

  /**
   * Reads the children of a directory on demand. Used to lazily expand a folder
   * in the tree instead of walking the entire repo up front. Sub-directories
   * come back collapsed with empty `children`.
   */
  async loadChildren(path: string): Promise<(VertexFile | VertexFolder)[]> {
    if (!this.opfs) throw new Error('No virtual FS — clone a repo first');
    return fileTree.readLevel(this.opfs, path);
  }

  /**
   * Rebuilds the tree from the FS after a structural change (new folder, rename,
   * delete) while preserving the user's expansion. Only previously-loaded levels
   * are re-read, so folders don't collapse and no open-but-empty nodes are left
   * behind. Falls back to a fresh top-level build if there is no previous tree.
   */
  async refreshTree(previous: VertexFolder | null): Promise<VertexFolder | null> {
    if (!this.opfs) throw new Error('No virtual FS — clone a repo first');
    if (!previous) return null;
    return fileTree.refreshTree(this.opfs, previous);
  }

  private async saveSession(name: string, url: string, dir: string): Promise<void> {
    await db.sessions.clear();
    await db.sessions.add({ name, url, dir, timestamp: Date.now(), version: SESSION_VERSION });
  }

  async loadSession(): Promise<VertexFolder | null> {
    try {
      const session = await db.sessions.orderBy('timestamp').last();
      if (!session || session.version !== SESSION_VERSION) {
        await this.clearSession();
        return null;
      }

      const fsName = `vertex-repo-${session.name}`;
      this.opfs = new OPFSFS(fsName);
      this.virtualFs = new VirtualFS('opfs', fsName);
      this.gitClient = new GitClient(this.opfs);

      const rootEntries = await this.opfs.readDir('/');
      if (rootEntries.length === 0) {
        await this.clearSession();
        return null;
      }

      const folder = await fileTree.buildRootFolder(this.opfs, '/', session.name);
      this.isVirtualMode.set(true);
      this.repoName.set(session.name);
      return folder;
    } catch {
      await this.clearSession();
      return null;
    }
  }

  async clearSession(): Promise<void> {
    await db.sessions.clear();
    this.opfs = null;
    this.virtualFs = null;
    this.gitClient = null;
    this.isVirtualMode.set(false);
    this.repoName.set('');
  }

  private extractRepoName(url: string): string {
    const parts = url.replace(/\.git$/, '').split('/');
    return parts.at(-1) ?? 'repo';
  }
}
