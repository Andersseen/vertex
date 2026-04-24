import { WebContainerRunner } from '../preview-wc-headless/webcontainer-runner'
import type { RunnerOptions, RunnerPhase, RunnerLog } from '../preview-wc-headless/types'
import { bindUrl } from './iframe-binder'

export type PreviewPhase = RunnerPhase

export interface PreviewConfig {
  /** npm script to run as dev server. Auto-detects dev → start → serve when omitted. */
  devScript?: string
  /** Skip `install` step (e.g. when node_modules is already cached). */
  skipInstall?: boolean
  /** Reuse an existing runner instead of constructing one internally. */
  runner?: WebContainerRunner
  onPhase?: (phase: PreviewPhase, message?: string) => void
  onLog?: (log: RunnerLog) => void
}

export interface PreviewSession {
  url: string
  /** Reload the iframe. */
  reload(): void
  /** Stop the dev server and tear down the WebContainer. */
  stop(): Promise<void>
}

/**
 * UI-aware wrapper around WebContainerRunner.
 * Takes an HTMLIFrameElement in the constructor and wires the dev-server URL into it.
 * Framework-agnostic — caller owns and creates the iframe element.
 *
 * The iframe should have:
 *   sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
 */
export class WebContainerPreview {
  private runner: WebContainerRunner | null = null
  private unbind: (() => void) | null = null
  private running = false

  constructor(
    private readonly iframe: HTMLIFrameElement,
    private readonly runnerOptions: RunnerOptions,
  ) {}

  async start(config: PreviewConfig = {}): Promise<PreviewSession> {
    if (this.running) await this.stop()

    const mergedOptions: RunnerOptions = {
      ...this.runnerOptions,
      onPhase: (phase, msg) => {
        this.runnerOptions.onPhase?.(phase, msg)
        config.onPhase?.(phase, msg)
      },
      onLog: (log) => {
        this.runnerOptions.onLog?.(log)
        config.onLog?.(log)
      },
    }

    const runner = config.runner ?? new WebContainerRunner(mergedOptions)
    this.runner = runner

    if (!runner.isRunning()) {
      await runner.boot()
    }

    if (!config.skipInstall) {
      const result = await runner.install()
      if (result.exitCode !== 0) {
        throw new Error(`Install exited with code ${result.exitCode}`)
      }
    }

    const devServer = await runner.startDevServer(config.devScript)

    this.unbind = bindUrl(this.iframe, devServer.url)
    this.running = true

    return {
      url: devServer.url,
      reload: () => {
        this.iframe.contentWindow?.location.reload()
      },
      stop: () => this.stop(),
    }
  }

  async stop(): Promise<void> {
    this.unbind?.()
    this.unbind = null
    await this.runner?.destroy()
    this.runner = null
    this.running = false
  }

  isRunning(): boolean {
    return this.running
  }
}
