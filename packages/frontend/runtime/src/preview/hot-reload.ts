import type { IVirtualFS, WatchCallback } from '../types/fs.types'
import type { ServiceWorkerManager } from './service-worker/sw-manager'

export class HotReload {
  private unwatchers: Array<() => void> = []
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private pendingChanges = new Set<string>()
  private iframeRef: { contentWindow: Window | null }

  constructor(
    private readonly fs: IVirtualFS,
    private readonly swManager: ServiceWorkerManager,
    iframeRef: { contentWindow: Window | null }
  ) {
    this.iframeRef = iframeRef
  }

  start(watchDir = '/dist'): void {
    const unwatch = this.fs.watch(watchDir, this.handleChange)
    this.unwatchers.push(unwatch)
  }

  stop(): void {
    this.unwatchers.forEach((fn) => fn())
    this.unwatchers = []
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
  }

  private readonly handleChange: WatchCallback = (event, path) => {
    if (event === 'delete') {
      this.swManager.deleteFile(path)
      return
    }
    this.pendingChanges.add(path)
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => this.flushChanges(), 50)
  }

  private async flushChanges(): Promise<void> {
    const paths = [...this.pendingChanges]
    this.pendingChanges.clear()

    for (const path of paths) {
      try {
        const content = await this.fs.readFile(path)
        this.swManager.updateFile(path, content)
      } catch {
        // file may have been deleted between watch event and read
      }
    }

    this.iframeRef.contentWindow?.postMessage({ type: 'HMR_UPDATE', paths }, '*')
  }
}
