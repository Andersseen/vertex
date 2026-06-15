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

  async deleteDirectory(path: string): Promise<void> {
    const normalized = this.normalize(path)
    const prefix = normalized === '/' ? '/' : normalized + '/'
    for (const [filePath] of this.files) {
      if (filePath === normalized || filePath.startsWith(prefix)) {
        this.files.delete(filePath)
        this.notify('delete', filePath)
      }
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const oldNormalized = this.normalize(oldPath)
    const newNormalized = this.normalize(newPath)
    const content = this.files.get(oldNormalized)
    if (content !== undefined) {
      this.files.set(newNormalized, content)
      this.files.delete(oldNormalized)
      this.notify('delete', oldNormalized)
      this.notify('change', newNormalized)
      return
    }

    // Directory rename: move all children.
    const oldPrefix = oldNormalized === '/' ? '/' : oldNormalized + '/'
    const newPrefix = newNormalized === '/' ? '/' : newNormalized + '/'
    for (const [filePath, fileContent] of this.files) {
      if (filePath === oldNormalized || filePath.startsWith(oldPrefix)) {
        const relative = filePath.slice(oldPrefix.length)
        const target = newPrefix + relative
        this.files.set(target, fileContent)
        this.files.delete(filePath)
        this.notify('delete', filePath)
        this.notify('change', target)
      }
    }
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
      if (!segment || seen.has(segment)) continue
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
    // In-memory FS: directories are implicit from file paths
  }

  watch(path: string, cb: WatchCallback): () => void {
    const normalized = this.normalize(path)
    if (!this.watchers.has(normalized)) this.watchers.set(normalized, new Set())
    this.watchers.get(normalized)!.add(cb)
    return () => this.watchers.get(normalized)?.delete(cb)
  }

  async clear(): Promise<void> {
    this.files.clear()
    this.watchers.clear()
  }

  private normalize(path: string): string {
    return path.startsWith('/') ? path : '/' + path
  }

  private notify(event: 'change' | 'add' | 'delete', path: string): void {
    this.watchers.get(path)?.forEach(cb => cb(event, path))
    // Notificar watchers del root también
    if (path !== '/') this.watchers.get('/')?.forEach(cb => cb(event, path))
  }
}
