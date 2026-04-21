import { ServiceWorkerManager } from './service-worker/sw-manager'
import { HotReload } from './hot-reload'
import { generateIndexHtml } from './template'
import type { IVirtualFS } from '../types/fs.types'
import type { PreviewConfig, PreviewSession, IPreviewManager } from '../types/preview.types'

export class PreviewManager implements IPreviewManager {
  private readonly swManager = new ServiceWorkerManager()
  private hotReload: HotReload | null = null
  private running = false

  constructor(
    private readonly fs: IVirtualFS,
    private readonly swUrl = '/vertex-sw.js'
  ) {}

  async start(config: PreviewConfig): Promise<PreviewSession> {
    if (this.running) await this.stop()

    await this.swManager.register(this.swUrl)

    const files = await this.collectFiles(config.serveDir)

    if (!files['/index.html']) {
      const indexHtml = config.indexHtml
        ? await this.fs.readFile(config.indexHtml).catch(() => null)
        : null

      files['/index.html'] =
        indexHtml ??
        generateIndexHtml({
          title: 'Vertex Preview',
          entryScript: '/main.js',
          cssFiles: files['/main.css'] !== undefined ? ['/main.css'] : [],
        })
    }

    await this.swManager.mountFiles(files)
    this.running = true

    const iframeRef: { contentWindow: Window | null } = { contentWindow: null }
    this.hotReload = new HotReload(this.fs, this.swManager, iframeRef)
    this.hotReload.start(config.serveDir)

    const previewUrl = `${config.baseUrl}/index.html`

    const session: PreviewSession = {
      url: previewUrl,

      reload: () => {
        iframeRef.contentWindow?.location.reload()
      },

      hotReload: async (paths: string[]) => {
        for (const path of paths) {
          try {
            const content = await this.fs.readFile(path)
            this.swManager.updateFile(path, content)
          } catch {
            // ignore missing files
          }
        }
        iframeRef.contentWindow?.postMessage({ type: 'HMR_UPDATE', paths }, '*')
      },

      destroy: () => {
        this.stop()
      },
    }

    // Expose iframeRef setter so the Angular component can wire up the real iframe
    ;(session as PreviewSession & { _setIframe(el: HTMLIFrameElement): void })._setIframe = (
      el: HTMLIFrameElement
    ) => {
      iframeRef.contentWindow = el.contentWindow
    }

    return session
  }

  async stop(): Promise<void> {
    this.hotReload?.stop()
    this.hotReload = null
    try {
      this.swManager.clear()
      await this.swManager.unregister()
    } catch {
      // ignore errors on cleanup
    }
    this.running = false
  }

  isRunning(): boolean {
    return this.running
  }

  private async collectFiles(dir: string): Promise<Record<string, string>> {
    const result: Record<string, string> = {}
    await this.collectRecursive(dir, dir, result)
    return result
  }

  private async collectRecursive(
    baseDir: string,
    currentDir: string,
    result: Record<string, string>
  ): Promise<void> {
    let entries
    try {
      entries = await this.fs.readDir(currentDir)
    } catch {
      return
    }

    for (const entry of entries) {
      if (entry.type === 'file') {
        try {
          const content = await this.fs.readFile(entry.path)
          // Normalize to path relative to baseDir, rooted at /
          const swPath = '/' + entry.path.slice(baseDir.length).replace(/^\//, '')
          result[swPath] = content
        } catch {
          // skip unreadable files
        }
      } else {
        await this.collectRecursive(baseDir, entry.path, result)
      }
    }
  }
}
