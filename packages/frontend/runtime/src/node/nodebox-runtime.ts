import { Nodebox } from '@codesandbox/nodebox'
import type { IVirtualFS, DirEntry } from '../types/fs.types'
import type {
  INodeRuntime,
  NodeRuntimeOptions,
  NpmInstallOptions,
  ScriptRunOptions,
  DevServerInfo,
} from '../types/node.types'

const DEV_SERVER_TIMEOUT_MS = 60_000
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.turbo',
  '.astro',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.cache',
  '.output',
  'coverage',
  '.vercel',
  '.wrangler',
])
// Lockfiles from other package managers confuse Nodebox's npm.
const SKIP_FILES = new Set(['pnpm-lock.yaml', 'yarn.lock', 'bun.lockb', 'bun.lock'])

export class NodeboxRuntime implements INodeRuntime {
  private nodebox: Nodebox | null = null
  private iframe: HTMLIFrameElement | null = null
  private fs: IVirtualFS | null = null

  constructor(private readonly virtualFs?: IVirtualFS) {
    this.fs = virtualFs ?? null
  }

  async init(options?: NodeRuntimeOptions): Promise<void> {
    this.iframe = this.createHiddenIframe()

    this.nodebox = new Nodebox({ iframe: this.iframe })
    await this.nodebox.connect()

    const files = options?.files ?? (this.fs ? await this.dumpVirtualFs() : {})

    if (Object.keys(files).length > 0) {
      await this.nodebox.fs.init(files)
    }
  }

  async install(options?: NpmInstallOptions): Promise<void> {
    this.assertReady()

    const shell = this.nodebox!.shell.create()
    const args: string[] = ['install']

    if (options?.packages?.length) {
      args.push(...options.packages)
      if (options.dev) args.push('--save-dev')
      if (options.exact) args.push('--save-exact')
    }

    const logs: string[] = []
    const tailLimit = 8000
    const onData = (chunk: string) => {
      logs.push(chunk)
      options?.onOutput?.(chunk)
    }
    shell.stdout.on('data', onData)
    shell.stderr.on('data', onData)

    await shell.runCommand('npm', args)

    await new Promise<void>((resolve, reject) => {
      shell.on('exit', (code) => {
        if (code === 0) {
          resolve()
          return
        }
        const tail = logs.join('').slice(-tailLimit).trim()
        const detail = tail ? `\n--- npm output (tail) ---\n${tail}` : ''
        reject(new Error(`npm install exited with code ${code}${detail}`))
      })
    })
  }

  async run(options: ScriptRunOptions): Promise<number> {
    this.assertReady()

    const shell = this.nodebox!.shell.create()

    shell.stdout.on('data', (data) => options.onOutput?.(data, 'stdout'))
    shell.stderr.on('data', (data) => options.onOutput?.(data, 'stderr'))

    await shell.runCommand('npm', ['run', options.script, ...(options.args ?? [])])

    return new Promise<number>((resolve) => {
      shell.on('exit', (code) => {
        options.onExit?.(code)
        resolve(code)
      })
    })
  }

  async startDevServer(script: string): Promise<DevServerInfo> {
    this.assertReady()

    const shell = this.nodebox!.shell.create()
    await shell.runCommand('npm', ['run', script])

    const preview = await this.nodebox!.preview.getByShellId(
      shell.id!,
      DEV_SERVER_TIMEOUT_MS,
    )

    return {
      url: preview.url,
      port: preview.port,
      ready: true,
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.assertReady()
    await this.nodebox!.fs.writeFile(path, content)

    if (this.fs) {
      await this.fs.writeFile(path, content)
    }
  }

  async readFile(path: string): Promise<string> {
    this.assertReady()
    return this.nodebox!.fs.readFile(path, 'utf8')
  }

  async destroy(): Promise<void> {
    this.nodebox = null
    if (this.iframe?.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe)
    }
    this.iframe = null
  }

  private assertReady(): void {
    if (!this.nodebox) throw new Error('NodeboxRuntime not initialized. Call init() first.')
  }

  private createHiddenIframe(): HTMLIFrameElement {
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'display:none;width:0;height:0;border:none;position:absolute;'
    iframe.setAttribute('allow', 'cross-origin-isolated')
    document.body.appendChild(iframe)
    return iframe
  }

  private async dumpVirtualFs(): Promise<Record<string, string>> {
    const result: Record<string, string> = {}
    await this.collectFiles('/', result)
    return result
  }

  private async collectFiles(dir: string, out: Record<string, string>): Promise<void> {
    if (!this.fs) return

    let entries: DirEntry[]
    try {
      entries = await this.fs.readDir(dir)
    } catch {
      return
    }

    for (const entry of entries) {
      const name = entry.name
      if (entry.type === 'directory') {
        if (SKIP_DIRS.has(name)) continue
        await this.collectFiles(entry.path, out)
      } else {
        if (SKIP_FILES.has(name)) continue
        try {
          const content = await this.fs.readFile(entry.path)
          if (typeof content === 'string') {
            out[entry.path] = content
          }
        } catch {
          // skip unreadable files
        }
      }
    }
  }
}
