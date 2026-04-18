import { Injectable, signal } from '@angular/core';
import { VirtualFS, GitClient, OPFSFS } from '@vertex/runtime';
import type { GitCloneOptions, IVirtualFS } from '@vertex/runtime';
import type { VertexFile, VertexFolder } from '@vertex/types';

export interface CloneProgress {
  phase: string;
  loaded: number;
  total: number;
  percent: number;
}

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', '.angular', 'build', '.next']);

const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  html: 'html', css: 'css', scss: 'css', json: 'json', md: 'markdown',
  py: 'python', rs: 'rust', go: 'go', sh: 'bash', yaml: 'yaml', yml: 'yaml',
  toml: 'toml', txt: 'text',
};

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

  /** Acceso directo al filesystem virtual para integraciones (ej: terminal) */
  get fs(): IVirtualFS | null {
    return this.virtualFs;
  }

  /** Acceso directo al cliente Git */
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

      const folder = await this.buildFolderTree('/', name, '/');
      this.isVirtualMode.set(true);
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

  getGitClient(): GitClient | null {
    return this.gitClient;
  }

  private async buildFolderTree(
    dir: string,
    name: string,
    rootDir: string,
  ): Promise<VertexFolder> {
    if (!this.opfs) throw new Error('No FS');

    const entries = await this.opfs.readDir(dir);
    const children: (VertexFile | VertexFolder)[] = [];

    const sorted = entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of sorted) {
      if (IGNORED_DIRS.has(entry.name)) continue;

      if (entry.type === 'directory') {
        const subFolder = await this.buildFolderTree(entry.path, entry.name, rootDir);
        children.push(subFolder);
      } else {
        children.push(this.toVertexFile(entry.path, entry.name));
      }
    }

    return {
      id: dir,
      name: dir === rootDir ? name : name,
      path: dir,
      children,
      isExpanded: dir === rootDir,
    };
  }

  private toVertexFile(path: string, name: string): VertexFile {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    return {
      id: path,
      name,
      path,
      content: '',
      language: LANGUAGE_MAP[ext] ?? 'text',
      isDirty: false,
    };
  }

  private extractRepoName(url: string): string {
    const parts = url.replace(/\.git$/, '').split('/');
    return parts.at(-1) ?? 'repo';
  }
}
