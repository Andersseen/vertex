import { WebContainer } from '@webcontainer/api'
import type { FileSystemTree } from '@webcontainer/api'
import { detectPackageManager } from './package-manager-detect'
import { vfsToFileSystemTree } from './file-mount'
import { extractDir as doExtractDir } from './output-extract'
import type {
  RunnerOptions,
  RunnerPhase,
  RunnerLog,
  DevServer,
  RunResult,
  ExtractedFiles,
} from './types'

const DEFAULT_DEV_SERVER_TIMEOUT = 60_000

export class WebContainerRunner {
  private container: WebContainer | null = null
  private running = false

  constructor(private readonly options: RunnerOptions) {}

  async boot(): Promise<void> {
    if (this.container) return

    this.emit('boot')
    this.container = await WebContainer.boot()

    const { fs, files, gitClone } = this.options

    if (fs) {
      this.emit('mount')
      const tree = await vfsToFileSystemTree(fs)
      await this.container.mount(tree)
    } else if (files) {
      this.emit('mount')
      await this.container.mount(files as FileSystemTree)
    }

    if (gitClone) {
      this.emit('mount', 'Cloning repository…')
      const url = gitClone.token
        ? gitClone.url.replace('https://', `https://${gitClone.token}@`)
        : gitClone.url
      const args = ['clone', url, '.']
      if (gitClone.branch) args.push('--branch', gitClone.branch)
      const result = await this.exec('git', args)
      if (result.exitCode !== 0) {
        this.emit('failed', 'git clone failed')
        throw new Error(`git clone exited with code ${result.exitCode}`)
      }
    }

    this.running = true
  }

  async install(flagsOverride?: string[]): Promise<RunResult> {
    const container = this.requireContainer()
    this.emit('install')

    const pm = this.options.packageManager ?? (await detectPackageManager(container))

    // Install the package manager itself if it isn't npm.
    if (pm !== 'npm') {
      await this.exec('npm', ['install', '-g', pm])
    }

    const flags = flagsOverride ?? this.options.installFlags ?? []
    return this.exec(pm, ['install', ...flags])
  }

  async run(script: string, args: string[] = []): Promise<RunResult> {
    this.emit('run', script)
    return this.exec('npm', ['run', script, ...args])
  }

  async startDevServer(script?: string): Promise<DevServer> {
    const container = this.requireContainer()
    this.emit('dev', script ? `Starting '${script}'…` : 'Starting dev server…')

    const devScript = script ?? (await this.detectDevScript())
    if (!devScript) {
      throw new Error(
        'No dev script found. Expected one of: dev, start, serve in package.json scripts.',
      )
    }

    const timeout = this.options.devServerTimeout ?? DEFAULT_DEV_SERVER_TIMEOUT

    const { url, port } = await Promise.race([
      new Promise<{ url: string; port: number }>((resolve) => {
        container.on('server-ready', (p, u) => resolve({ url: u, port: p }))
        void container.spawn('npm', ['run', devScript]).then((proc) => {
          proc.output.pipeTo(
            new WritableStream({
              write: (chunk) => this.emitLog({ stream: 'stdout', chunk }),
            }),
          )
        })
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Dev server timed out after ${timeout}ms`)), timeout),
      ),
    ])

    this.emit('ready', url)

    return {
      url,
      port,
      stop: () => this.destroy(),
    }
  }

  async extractDir(path: string): Promise<ExtractedFiles> {
    const container = this.requireContainer()
    return doExtractDir(container, path)
  }

  async readFile(path: string): Promise<Uint8Array> {
    return this.requireContainer().fs.readFile(path)
  }

  async writeFile(path: string, content: Uint8Array | string): Promise<void> {
    await this.requireContainer().fs.writeFile(path, content)
  }

  async exec(command: string, args: string[]): Promise<RunResult> {
    const container = this.requireContainer()
    const start = Date.now()
    const proc = await container.spawn(command, args)

    proc.output.pipeTo(
      new WritableStream({
        write: (chunk) => this.emitLog({ stream: 'stdout', chunk }),
      }),
    )

    const exitCode = await proc.exit
    return { exitCode, durationMs: Date.now() - start }
  }

  async destroy(): Promise<void> {
    if (this.container) {
      this.container.teardown()
      this.container = null
    }
    this.running = false
    this.emit('stopped')
  }

  isRunning(): boolean {
    return this.running
  }

  private requireContainer(): WebContainer {
    if (!this.container) throw new Error('WebContainerRunner: call boot() first')
    return this.container
  }

  private async detectDevScript(): Promise<string | null> {
    try {
      const raw = await this.requireContainer().fs.readFile('package.json', 'utf-8')
      const pkg = JSON.parse(raw) as { scripts?: Record<string, string> }
      const scripts = pkg.scripts ?? {}
      for (const candidate of ['dev', 'start', 'serve']) {
        if (scripts[candidate]) return candidate
      }
    } catch {
      // no package.json or parse error — caller will throw
    }
    return null
  }

  private emit(phase: RunnerPhase, message?: string): void {
    this.options.onPhase?.(phase, message)
  }

  private emitLog(log: RunnerLog): void {
    this.options.onLog?.(log)
  }
}
