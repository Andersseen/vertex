import LightningFS from '@isomorphic-git/lightning-fs'
import type { IVirtualFS, FileContent, DirEntry, WatchCallback } from '../types/fs.types'

export class OPFSFS implements IVirtualFS {
  private fs: LightningFS
  private readonly dbName: string
  private watchers = new Map<string, Set<WatchCallback>>()

  constructor(name = 'vertex-runtime') {
    this.dbName = name
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

  async deleteDirectory(path: string): Promise<void> {
    await this.clearDir(path)
    await this.fs.promises.rmdir(path).catch(() => {})
    this.notify('delete', path)
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const content = await this.fs.promises.readFile(oldPath, { encoding: 'utf8' }).catch(() => null)
    if (content !== null) {
      await this.ensureDir(this.dirname(newPath))
      await this.fs.promises.writeFile(newPath, content as string)
      await this.fs.promises.unlink(oldPath)
      this.notify('delete', oldPath)
      this.notify('change', newPath)
      return
    }

    // Directory rename: recursive copy + delete.
    await this.copyDir(oldPath, newPath)
    await this.deleteDirectory(oldPath)
  }

  private async clearDir(dir: string): Promise<void> {
    const names = (await this.fs.promises.readdir(dir).catch(() => [])) as string[]
    for (const name of names) {
      if (name === '.' || name === '..') continue
      const fullPath = `${dir}/${name}`.replace('//', '/')
      const stat = await this.fs.promises.stat(fullPath)
      if ((stat as { type?: string }).type === 'dir') {
        await this.clearDir(fullPath)
        await this.fs.promises.rmdir(fullPath).catch(() => {})
      } else {
        await this.fs.promises.unlink(fullPath).catch(() => {})
      }
    }
  }

  private async copyDir(oldDir: string, newDir: string): Promise<void> {
    await this.ensureDir(newDir)
    const entries = await this.fs.promises.readdir(oldDir)
    for (const name of entries) {
      if (name === '.' || name === '..') continue
      const oldPath = `${oldDir}/${name}`.replace('//', '/')
      const newPath = `${newDir}/${name}`.replace('//', '/')
      const stat = await this.fs.promises.stat(oldPath)
      if ((stat as { type?: string }).type === 'dir') {
        await this.copyDir(oldPath, newPath)
      } else {
        const content = await this.fs.promises.readFile(oldPath, { encoding: 'utf8' })
        await this.fs.promises.writeFile(newPath, content as string)
        this.notify('change', newPath)
      }
    }
  }

  async readDir(path: string): Promise<DirEntry[]> {
    const names = (await this.fs.promises.readdir(path)) as string[]
    const entries: DirEntry[] = []
    for (const name of names) {
      if (name === '.' || name === '..') continue
      const fullPath = `${path}/${name}`.replace('//', '/')
      const stat = await this.fs.promises.stat(fullPath)
      entries.push({
        name,
        path: fullPath,
        type: (stat as { type?: string }).type === 'dir' ? 'directory' : 'file',
      })
    }
    return entries
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.fs.promises.stat(path)
      return true
    } catch {
      return false
    }
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
    this.fs = new LightningFS(this.dbName, { wipe: true })
    this.watchers.clear()
  }

  private async ensureDir(path: string): Promise<void> {
    if (!path || path === '/') return
    if (await this.exists(path)) return
    await this.ensureDir(this.dirname(path))
    await this.fs.promises.mkdir(path)
  }

  private dirname(path: string): string {
    return path.substring(0, path.lastIndexOf('/')) || '/'
  }

  private notify(event: 'change' | 'add' | 'delete', path: string): void {
    this.watchers.get(path)?.forEach(cb => cb(event, path))
    if (path !== '/') this.watchers.get('/')?.forEach(cb => cb(event, path))
  }

  get rawFs(): LightningFS {
    return this.fs
  }
}
