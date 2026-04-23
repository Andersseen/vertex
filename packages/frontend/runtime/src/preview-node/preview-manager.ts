import { NodeboxRuntime } from '../node/nodebox-runtime'
import { detectDevScript, readPackageJson } from '../build/resolver'
import type { IVirtualFS } from '../types/fs.types'
import type {
  PreviewNodeConfig,
  PreviewNodePhase,
  PreviewSession,
} from '../types/preview.types'

/**
 * PreviewNodeManager runs a project's real Node dev server in a Nodebox
 * (CodeSandbox) iframe and exposes its preview URL.
 *
 * Flow:
 *   init  → Nodebox boots, VirtualFS is copied into its in-memory FS
 *   install → `npm install` (can skip via config.skipInstall)
 *   dev-server → `npm run <devScript>`, Nodebox assigns a preview URL
 *   ready → returned PreviewSession.url is mounted in the consumer iframe
 */
export class PreviewNodeManager {
  private runtime: NodeboxRuntime | null = null
  private running = false

  constructor(private readonly fs: IVirtualFS) {}

  async start(config: PreviewNodeConfig = {}): Promise<PreviewSession> {
    if (this.running) await this.stop()

    const phase = (p: PreviewNodePhase, msg?: string) => config.onPhase?.(p, msg)

    try {
      phase('init', 'Booting Node runtime')
      this.runtime = new NodeboxRuntime(this.fs)
      await this.runtime.init()

      if (!config.skipInstall) {
        phase('install', 'Installing dependencies')
        await this.runtime.install({
          onOutput: (chunk) => config.onLog?.(chunk, 'stdout'),
        })
      }

      const pkg = await readPackageJson(this.fs, '/')
      const script = config.devScript ?? detectDevScript(pkg)
      if (!script) {
        throw new Error(
          'No dev script found. Add one of `dev`, `start`, or `serve` to package.json.',
        )
      }

      phase('dev-server', `Starting npm run ${script}`)
      const info = await this.runtime.startDevServer(script)
      this.running = true
      phase('ready', info.url)

      const runtime = this.runtime
      return {
        url: info.url,
        reload: () => {
          // Iframe reload is handled by the consumer (no session-level iframe ref here).
        },
        hotReload: async () => {
          // Nodebox dev servers handle HMR internally over WebSocket.
        },
        destroy: () => {
          void this.stop()
          void runtime
        },
      }
    } catch (err) {
      phase('failed', err instanceof Error ? err.message : String(err))
      await this.stop()
      throw err
    }
  }

  async stop(): Promise<void> {
    try {
      await this.runtime?.destroy()
    } catch {
      /* ignore */
    }
    this.runtime = null
    this.running = false
  }

  isRunning(): boolean {
    return this.running
  }
}
