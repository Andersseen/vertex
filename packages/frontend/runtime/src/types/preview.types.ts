export interface PreviewConfig {
  /** Path prefix the SW will intercept, e.g. '/vertex-preview' */
  baseUrl: string
  /** Directory in VirtualFS containing built files, e.g. '/dist' */
  serveDir: string
  /** Optional explicit index.html path inside VirtualFS */
  indexHtml?: string
}

export interface PreviewSession {
  /** URL to set as iframe src */
  url: string
  reload(): void
  destroy(): void
}

export interface IPreviewManager {
  start(config: PreviewConfig): Promise<PreviewSession>
  stop(): Promise<void>
  isRunning(): boolean
}
