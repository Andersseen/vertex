export interface NodeRuntimeOptions {
  files?: Record<string, string>
  nodeVersion?: string
}

export interface NpmInstallOptions {
  packages?: string[]
  dev?: boolean
  exact?: boolean
  onOutput?: (chunk: string) => void
}

export interface ScriptRunOptions {
  script: string
  args?: string[]
  onOutput?: (line: string, type: 'stdout' | 'stderr') => void
  onExit?: (code: number) => void
}

export interface DevServerInfo {
  url: string
  port: number
  ready: boolean
}

export interface TerminalAdapter {
  write(data: string): void
  onData(callback: (data: string) => void): void
}

export interface INodeRuntime {
  init(options?: NodeRuntimeOptions): Promise<void>
  install(options?: NpmInstallOptions): Promise<void>
  run(options: ScriptRunOptions): Promise<number>
  startDevServer(script: string): Promise<DevServerInfo>
  writeFile(path: string, content: string): Promise<void>
  readFile(path: string): Promise<string>
  destroy(): Promise<void>
}
