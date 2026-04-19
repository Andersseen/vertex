# Phase 1 — VirtualFS + Git
> **Objetivo:** Clonar un repo desde URL y leer/editar/escribir archivos 100% en browser.
> **Duración estimada:** 1-2 semanas
> **Resultado:** `@vertex/runtime` publicable en npm con FS + Git funcional.

---

## Prerrequisitos

```bash
# Desde la raíz del monorepo
bun add isomorphic-git @isomorphic-git/lightning-fs
```

---

## Estructura de archivos a crear

```
packages/frontend/runtime/
├── src/
│   ├── fs/
│   │   ├── virtual-fs.ts          ← Clase principal VirtualFS
│   │   ├── opfs-adapter.ts        ← Persistencia real con OPFS
│   │   ├── memory-adapter.ts      ← Sólo memoria (sin persistencia)
│   │   └── index.ts
│   ├── git/
│   │   ├── git-client.ts          ← Wrapper de isomorphic-git
│   │   ├── git-auth.ts            ← GitHub token / OAuth helper
│   │   └── index.ts
│   ├── types/
│   │   ├── fs.types.ts
│   │   └── git.types.ts
│   └── index.ts                   ← Barrel export público
├── tests/
│   ├── virtual-fs.test.ts
│   └── git-client.test.ts
├── package.json
└── tsconfig.json
```

---

## Interfaces clave (`src/types/`)

### `fs.types.ts`
```typescript
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
  readDir(path: string): Promise<DirEntry[]>
  exists(path: string): Promise<boolean>
  mkdir(path: string): Promise<void>
  watch(path: string, cb: WatchCallback): () => void  // retorna unwatch
  clear(): Promise<void>
}
```

### `git.types.ts`
```typescript
export interface GitCloneOptions {
  url: string
  dir?: string          // default: '/'
  branch?: string       // default: HEAD
  depth?: number        // default: 1 (shallow clone)
  token?: string        // GitHub token para repos privados
  onProgress?: (phase: string, loaded: number, total: number) => void
}

export interface GitCommitOptions {
  message: string
  author: { name: string; email: string }
  files?: string[]      // si vacío, add all
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
```

---

## Implementación paso a paso

### Paso 1 — Setup del package

**`packages/frontend/runtime/package.json`**
```json
{
  "name": "@vertex/runtime",
  "version": "0.1.0",
  "description": "Browser-native runtime: VirtualFS, Git, Build, Preview",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./fs": "./dist/fs/index.js",
    "./git": "./dist/git/index.js"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "bun test"
  },
  "dependencies": {
    "isomorphic-git": "^1.27.1",
    "@isomorphic-git/lightning-fs": "^4.6.0"
  },
  "peerDependencies": {
    "typescript": ">=5.0"
  }
}
```

**`packages/frontend/runtime/tsconfig.json`**
```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["tests", "dist"]
}
```

---

### Paso 2 — `memory-adapter.ts`

```typescript
import type { FileContent, DirEntry, IVirtualFS, WatchCallback } from '../types/fs.types'

export class MemoryFS implements IVirtualFS {
  private files = new Map<string, FileContent>()
  private watchers = new Map<string, Set<WatchCallback>>()

  async readFile(path: string): Promise<string> {
    const content = this.files.get(this.normalize(path))
    if (content === undefined) throw new Error(`File not found: ${path}`)
    return typeof content === 'string' ? content : new TextDecoder().decode(content)
  }

  async writeFile(path: string, content: FileContent): Promise<void> {
    const normalized = this.normalize(path)
    this.files.set(normalized, content)
    this.notify('change', normalized)
  }

  async deleteFile(path: string): Promise<void> {
    const normalized = this.normalize(path)
    if (!this.files.has(normalized)) throw new Error(`File not found: ${path}`)
    this.files.delete(normalized)
    this.notify('delete', normalized)
  }

  async readDir(path: string): Promise<DirEntry[]> {
    const dir = this.normalize(path)
    const prefix = dir === '/' ? '/' : dir + '/'
    const seen = new Set<string>()
    const entries: DirEntry[] = []

    for (const filePath of this.files.keys()) {
      if (!filePath.startsWith(prefix)) continue
      const rest = filePath.slice(prefix.length)
      const segment = rest.split('/')[0]
      if (seen.has(segment)) continue
      seen.add(segment)
      const fullPath = prefix + segment
      const isDir = rest.includes('/')
      entries.push({ name: segment, path: fullPath, type: isDir ? 'directory' : 'file' })
    }

    return entries
  }

  async exists(path: string): Promise<boolean> {
    const normalized = this.normalize(path)
    if (this.files.has(normalized)) return true
    const prefix = normalized + '/'
    return [...this.files.keys()].some(p => p.startsWith(prefix))
  }

  async mkdir(_path: string): Promise<void> {
    // In-memory FS: dirs are implicit from file paths
  }

  watch(path: string, cb: WatchCallback): () => void {
    const normalized = this.normalize(path)
    if (!this.watchers.has(normalized)) this.watchers.set(normalized, new Set())
    this.watchers.get(normalized)!.add(cb)
    return () => this.watchers.get(normalized)?.delete(cb)
  }

  async clear(): Promise<void> {
    this.files.clear()
  }

  private normalize(path: string): string {
    return path.startsWith('/') ? path : '/' + path
  }

  private notify(event: 'change' | 'add' | 'delete', path: string): void {
    this.watchers.get(path)?.forEach(cb => cb(event, path))
    this.watchers.get('/')?.forEach(cb => cb(event, path))
  }
}
```

---

### Paso 3 — `opfs-adapter.ts`

```typescript
import LightningFS from '@isomorphic-git/lightning-fs'
import type { IVirtualFS, FileContent, DirEntry, WatchCallback } from '../types/fs.types'

// LightningFS usa OPFS internamente: persiste entre sesiones
export class OPFSFS implements IVirtualFS {
  private fs: LightningFS
  private watchers = new Map<string, Set<WatchCallback>>()

  constructor(name = 'vertex-runtime') {
    this.fs = new LightningFS(name)
  }

  async readFile(path: string): Promise<string> {
    const buf = await this.fs.promises.readFile(path, { encoding: 'utf8' })
    return buf as string
  }

  async writeFile(path: string, content: FileContent): Promise<void> {
    await this.ensureDir(this.dirname(path))
    await this.fs.promises.writeFile(path, content as string)
    this.notify('change', path)
  }

  async deleteFile(path: string): Promise<void> {
    await this.fs.promises.unlink(path)
    this.notify('delete', path)
  }

  async readDir(path: string): Promise<DirEntry[]> {
    const names = await this.fs.promises.readdir(path) as string[]
    const entries: DirEntry[] = []
    for (const name of names) {
      const fullPath = `${path}/${name}`.replace('//', '/')
      const stat = await this.fs.promises.stat(fullPath)
      entries.push({
        name,
        path: fullPath,
        type: stat.isDirectory() ? 'directory' : 'file'
      })
    }
    return entries
  }

  async exists(path: string): Promise<boolean> {
    try { await this.fs.promises.stat(path); return true }
    catch { return false }
  }

  async mkdir(path: string): Promise<void> {
    await this.ensureDir(path)
  }

  watch(path: string, cb: WatchCallback): () => void {
    if (!this.watchers.has(path)) this.watchers.set(path, new Set())
    this.watchers.get(path)!.add(cb)
    return () => this.watchers.get(path)?.delete(cb)
  }

  async clear(): Promise<void> {
    // Wipe OPFS store
    this.fs = new LightningFS('vertex-runtime', { wipe: true })
  }

  private async ensureDir(path: string): Promise<void> {
    if (!path || path === '/') return
    const exists = await this.exists(path)
    if (!exists) {
      await this.ensureDir(this.dirname(path))
      await this.fs.promises.mkdir(path)
    }
  }

  private dirname(path: string): string {
    return path.substring(0, path.lastIndexOf('/')) || '/'
  }

  private notify(event: 'change' | 'add' | 'delete', path: string): void {
    this.watchers.get(path)?.forEach(cb => cb(event, path))
    this.watchers.get('/')?.forEach(cb => cb(event, path))
  }

  // Exponer fs puro para isomorphic-git
  get rawFs() { return this.fs }
}
```

---

### Paso 4 — `virtual-fs.ts` (fachada principal)

```typescript
import { MemoryFS } from './memory-adapter'
import { OPFSFS } from './opfs-adapter'
import type { IVirtualFS } from '../types/fs.types'

export type FSMode = 'memory' | 'opfs'

export class VirtualFS implements IVirtualFS {
  private adapter: MemoryFS | OPFSFS

  constructor(mode: FSMode = 'opfs', name?: string) {
    this.adapter = mode === 'opfs' ? new OPFSFS(name) : new MemoryFS()
  }

  // Proxy todos los métodos al adapter
  readFile = (path: string) => this.adapter.readFile(path)
  writeFile = (path: string, content: Parameters<IVirtualFS['writeFile']>[1]) =>
    this.adapter.writeFile(path, content)
  deleteFile = (path: string) => this.adapter.deleteFile(path)
  readDir = (path: string) => this.adapter.readDir(path)
  exists = (path: string) => this.adapter.exists(path)
  mkdir = (path: string) => this.adapter.mkdir(path)
  watch = (path: string, cb: Parameters<IVirtualFS['watch']>[1]) =>
    this.adapter.watch(path, cb)
  clear = () => this.adapter.clear()

  // Acceso al FS raw para isomorphic-git (solo OPFS)
  get rawFs() {
    if (this.adapter instanceof OPFSFS) return this.adapter.rawFs
    throw new Error('rawFs solo disponible en modo OPFS')
  }
}
```

---

### Paso 5 — `git-client.ts`

```typescript
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/web'
import type { OPFSFS } from '../fs/opfs-adapter'
import type { GitCloneOptions, GitCommitOptions, GitStatus, GitLogEntry, IGitClient } from '../types/git.types'

export class GitClient implements IGitClient {
  constructor(private fs: OPFSFS) {}

  async clone(options: GitCloneOptions): Promise<void> {
    const { url, dir = '/', branch, depth = 1, token, onProgress } = options
    await git.clone({
      fs: this.fs.rawFs,
      http,
      dir,
      url,
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
      headers: token ? { Authorization: `token ${token}` } : {},
    })
  }

  async push(dir: string, token: string): Promise<void> {
    await git.push({
      fs: this.fs.rawFs,
      http,
      dir,
      headers: { Authorization: `token ${token}` },
    })
  }

  async commit(dir: string, options: GitCommitOptions): Promise<string> {
    const { message, author, files } = options
    if (files?.length) {
      for (const file of files) await git.add({ fs: this.fs.rawFs, dir, filepath: file })
    } else {
      await git.add({ fs: this.fs.rawFs, dir, filepath: '.' })
    }
    return git.commit({ fs: this.fs.rawFs, dir, message, author })
  }

  async status(dir: string): Promise<GitStatus> {
    const matrix = await git.statusMatrix({ fs: this.fs.rawFs, dir })
    const result: GitStatus = { modified: [], added: [], deleted: [], untracked: [] }
    for (const [filepath, head, workdir, stage] of matrix) {
      if (head === 1 && workdir === 2) result.modified.push(filepath)
      else if (head === 0 && workdir === 2) result.added.push(filepath)
      else if (head === 1 && workdir === 0) result.deleted.push(filepath)
      else if (head === 0 && workdir === 2 && stage === 0) result.untracked.push(filepath)
    }
    return result
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
```

---

### Paso 6 — `index.ts` (barrel export)

```typescript
// Public API de Phase 1
export { VirtualFS } from './fs/virtual-fs'
export { MemoryFS } from './fs/memory-adapter'
export { OPFSFS } from './fs/opfs-adapter'
export { GitClient } from './git/git-client'
export type { IVirtualFS, FileContent, DirEntry, FSMode } from './types/fs.types'
export type { IGitClient, GitCloneOptions, GitCommitOptions, GitStatus, GitLogEntry } from './types/git.types'
```

---

## Tests a escribir

### `tests/virtual-fs.test.ts`
```typescript
import { describe, test, expect, beforeEach } from 'bun:test'
import { VirtualFS } from '../src/fs/virtual-fs'

describe('VirtualFS (memory mode)', () => {
  let fs: VirtualFS

  beforeEach(() => { fs = new VirtualFS('memory') })

  test('write and read file', async () => {
    await fs.writeFile('/src/app.ts', 'export const x = 1')
    expect(await fs.readFile('/src/app.ts')).toBe('export const x = 1')
  })

  test('readDir returns correct entries', async () => {
    await fs.writeFile('/src/app.ts', '')
    await fs.writeFile('/src/utils/helper.ts', '')
    const entries = await fs.readDir('/src')
    expect(entries.map(e => e.name)).toContain('app.ts')
    expect(entries.map(e => e.name)).toContain('utils')
  })

  test('delete file', async () => {
    await fs.writeFile('/a.ts', '')
    await fs.deleteFile('/a.ts')
    expect(await fs.exists('/a.ts')).toBe(false)
  })

  test('watch notifies on change', async () => {
    const events: string[] = []
    fs.watch('/', (event, path) => events.push(`${event}:${path}`))
    await fs.writeFile('/x.ts', 'content')
    expect(events).toContain('change:/x.ts')
  })
})
```

### `tests/git-client.test.ts`
```typescript
// Tests con mock HTTP para no depender de red en CI
import { describe, test, expect } from 'bun:test'
import { VirtualFS } from '../src/fs/virtual-fs'
import { GitClient } from '../src/git/git-client'

describe('GitClient', () => {
  test('status returns empty on clean repo', async () => {
    // Requiere clonar un repo real o usar fixtures
    // En CI usar --skip-if-no-network
  })
})
```

---

## Integración con `apps/web` (para probar en paralelo)

Una vez Phase 1 lista, puedes conectarla a la web app **sin romper nada**:

```typescript
// apps/web/src/app/services/workspace.service.ts
// Añadir al WorkspaceService existente:

import { VirtualFS, GitClient } from '@vertex/runtime'

// Nuevo modal "Abrir desde URL":
async openFromGitUrl(url: string, token?: string) {
  const fs = new VirtualFS('opfs', 'workspace')
  const git = new GitClient(fs as any)

  await git.clone({
    url,
    token,
    onProgress: (phase, loaded, total) => {
      this.cloneProgress.set({ phase, loaded, total })
    }
  })

  // Una vez clonado, el FileService existente puede leer
  // los archivos desde el VirtualFS en lugar del sidecar
  this.setVirtualWorkspace(fs)
}
```

---

## Criterio de "Phase 1 completada"

- [ ] `VirtualFS` en modo `memory` pasa todos los tests
- [ ] `VirtualFS` en modo `opfs` persiste entre recargas de página
- [ ] `GitClient.clone()` clona un repo público de GitHub en VirtualFS
- [ ] `GitClient.status()` detecta archivos modificados correctamente
- [ ] `GitClient.commit()` + `push()` funciona con token de GitHub
- [ ] Package buildea sin errores (`bun run build`)
- [ ] Exportable e instalable localmente (`bun add ../packages/frontend/runtime`)
- [ ] Modal en `apps/web` permite clonar repo por URL y muestra el árbol de archivos

---

## Dependencias externas

| Package | Versión | Por qué |
|---|---|---|
| `isomorphic-git` | `^1.27` | Git puro JS, funciona en browser |
| `@isomorphic-git/lightning-fs` | `^4.6` | FS con OPFS backend para persistencia |

No se necesita nada más en esta fase.
