# Phase 4 — Node.js Runtime (Nodebox)
> **Objetivo:** Correr `npm install` real, ejecutar scripts Node.js, y conectar con el terminal del IDE.
> **Prerrequisito:** Phases 1, 2 y 3 completadas.
> **Duración estimada:** 3-4 semanas
> **Resultado:** Soporte para proyectos con dependencias reales (sin CDN), dev servers, y terminal interactivo en browser.

---

## Por qué Nodebox en lugar de WebContainers

| | WebContainers | Nodebox |
|---|---|---|
| Licencia | Privada / pago en comercial | MIT (open source) |
| npm install | Completo | JS puro (sin nativos) |
| Node.js APIs | ~100% | ~80% |
| Tamaño WASM | ~50MB | ~15MB |
| Mantenimiento | StackBlitz | CodeSandbox (activo) |

Nodebox es la base; la podemos forkear y extender.

---

## Instalación

```bash
bun add @codesandbox/nodebox
```

---

## Estructura de archivos a crear

```
packages/frontend/runtime/src/
├── node/
│   ├── nodebox-runtime.ts       ← Wrapper principal de Nodebox
│   ├── npm-manager.ts           ← npm install / add / remove
│   ├── script-runner.ts         ← Correr npm scripts (dev, build, start)
│   ├── terminal-bridge.ts       ← Conecta Nodebox con el terminal existente
│   └── index.ts
├── types/
│   └── node.types.ts
```

---

## Interfaces clave

### `node.types.ts`
```typescript
export interface NodeRuntimeOptions {
  // Archivos iniciales a montar en el runtime
  files?: Record<string, string>
  // Entorno de Node.js
  nodeVersion?: string
}

export interface NpmInstallOptions {
  packages?: string[]       // Si vacío: instala todo el package.json
  dev?: boolean             // --save-dev
  exact?: boolean           // --save-exact
}

export interface ScriptRunOptions {
  script: string            // ej: 'dev', 'build', 'start'
  args?: string[]
  onOutput?: (line: string, type: 'stdout' | 'stderr') => void
  onExit?: (code: number) => void
}

export interface DevServerInfo {
  url: string               // URL del dev server dentro del SW
  port: number
  ready: boolean
}

export interface INodeRuntime {
  init(options?: NodeRuntimeOptions): Promise<void>
  install(options?: NpmInstallOptions): Promise<void>
  run(options: ScriptRunOptions): Promise<number>  // retorna exit code
  startDevServer(script: string): Promise<DevServerInfo>
  writeFile(path: string, content: string): Promise<void>
  readFile(path: string): Promise<string>
  destroy(): Promise<void>
}
```

---

## Implementación paso a paso

### Paso 1 — `nodebox-runtime.ts`

```typescript
import { Nodebox, type ShellProcess } from '@codesandbox/nodebox'
import type { IVirtualFS } from '../types/fs.types'
import type {
  NodeRuntimeOptions,
  NpmInstallOptions,
  ScriptRunOptions,
  DevServerInfo,
  INodeRuntime
} from '../types/node.types'

export class NodeboxRuntime implements INodeRuntime {
  private nodebox: Nodebox | null = null
  private shell: ShellProcess | null = null

  constructor(private fs?: IVirtualFS) {}

  async init(options: NodeRuntimeOptions = {}): Promise<void> {
    this.nodebox = new Nodebox({
      // iframe que Nodebox usa internamente para el SW
      iframe: this.createHiddenIframe(),
    })

    await this.nodebox.connect()

    // Montar archivos iniciales desde VirtualFS o desde options.files
    const files = options.files ?? (this.fs ? await this.dumpVirtualFS() : {})

    if (Object.keys(files).length > 0) {
      await this.nodebox.fs.init(files)
    }
  }

  async install(options: NpmInstallOptions = {}): Promise<void> {
    if (!this.nodebox) throw new Error('Runtime no inicializado. Llama init() primero.')

    const shell = await this.nodebox.shell.create()
    const args = ['install']

    if (options.packages?.length) {
      args.push(...options.packages)
      if (options.dev) args.push('--save-dev')
      if (options.exact) args.push('--save-exact')
    }

    const proc = shell.run('npm', args)
    await proc.waitForExit()
    shell.destroy()
  }

  async run(options: ScriptRunOptions): Promise<number> {
    if (!this.nodebox) throw new Error('Runtime no inicializado.')

    const shell = await this.nodebox.shell.create()
    const proc = shell.run('npm', ['run', options.script, ...(options.args ?? [])])

    proc.stdout.on('data', (data: string) => options.onOutput?.(data, 'stdout'))
    proc.stderr.on('data', (data: string) => options.onOutput?.(data, 'stderr'))

    const exitCode = await proc.waitForExit()
    options.onExit?.(exitCode)
    shell.destroy()

    return exitCode
  }

  async startDevServer(script = 'dev'): Promise<DevServerInfo> {
    if (!this.nodebox) throw new Error('Runtime no inicializado.')

    const shell = await this.nodebox.shell.create()
    const proc = shell.run('npm', ['run', script])

    // Esperar a que el dev server esté listo (detectar URL en output)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Dev server timeout')), 30_000)

      proc.stdout.on('data', (data: string) => {
        // Detectar URLs típicas de Vite, Next.js, CRA
        const urlMatch = data.match(/https?:\/\/localhost:(\d+)/)
        if (urlMatch) {
          clearTimeout(timeout)
          resolve({
            url: urlMatch[0],
            port: parseInt(urlMatch[1]),
            ready: true
          })
        }
      })
    })
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.nodebox) throw new Error('Runtime no inicializado.')
    await this.nodebox.fs.writeFile(path, content, 'utf8')
    // Sincronizar cambio al VirtualFS si existe
    await this.fs?.writeFile(path, content)
  }

  async readFile(path: string): Promise<string> {
    if (!this.nodebox) throw new Error('Runtime no inicializado.')
    return this.nodebox.fs.readFile(path, 'utf8')
  }

  async destroy(): Promise<void> {
    this.shell?.destroy()
    // Nodebox no tiene método destroy explícito, limpiar el iframe
    const iframe = document.querySelector('#vertex-nodebox-iframe')
    iframe?.remove()
    this.nodebox = null
  }

  // Volcar todo el VirtualFS al formato que Nodebox espera
  private async dumpVirtualFS(): Promise<Record<string, string>> {
    if (!this.fs) return {}
    const result: Record<string, string> = {}
    await this.dumpDir('/', result)
    return result
  }

  private async dumpDir(dir: string, result: Record<string, string>): Promise<void> {
    const entries = await this.fs!.readDir(dir)
    for (const entry of entries) {
      if (entry.name === 'node_modules') continue  // No volcar node_modules
      if (entry.type === 'file') {
        result[entry.path] = await this.fs!.readFile(entry.path)
      } else {
        await this.dumpDir(entry.path, result)
      }
    }
  }

  private createHiddenIframe(): HTMLIFrameElement {
    const iframe = document.createElement('iframe')
    iframe.id = 'vertex-nodebox-iframe'
    iframe.style.cssText = 'display:none;position:absolute;width:0;height:0;border:0'
    document.body.appendChild(iframe)
    return iframe
  }
}
```

---

### Paso 2 — `npm-manager.ts`

```typescript
import type { NodeboxRuntime } from './nodebox-runtime'
import type { IVirtualFS } from '../types/fs.types'

export interface PackageInfo {
  name: string
  version: string
  description?: string
}

export class NpmManager {
  constructor(
    private runtime: NodeboxRuntime,
    private fs: IVirtualFS
  ) {}

  async installAll(): Promise<void> {
    await this.runtime.install()
  }

  async addPackage(name: string, dev = false): Promise<void> {
    await this.runtime.install({ packages: [name], dev })
    // Actualizar package.json en VirtualFS
    await this.syncPackageJson()
  }

  async removePackage(name: string): Promise<void> {
    // npm uninstall via shell
    await this.runtime.run({
      script: 'uninstall',
      args: [name],
    })
    await this.syncPackageJson()
  }

  async listInstalled(): Promise<PackageInfo[]> {
    const pkg = JSON.parse(await this.fs.readFile('/package.json'))
    const all = { ...pkg.dependencies, ...pkg.devDependencies }
    return Object.entries(all).map(([name, version]) => ({
      name,
      version: version as string
    }))
  }

  private async syncPackageJson(): Promise<void> {
    const content = await this.runtime.readFile('/package.json')
    await this.fs.writeFile('/package.json', content)
  }
}
```

---

### Paso 3 — `terminal-bridge.ts`

Conecta Nodebox con el terminal ya existente en `apps/web` (xterm.js).

```typescript
import type { NodeboxRuntime } from './nodebox-runtime'

// Interfaz mínima compatible con xterm.js Terminal
export interface TerminalAdapter {
  write(data: string): void
  onData(callback: (data: string) => void): void
}

export class TerminalBridge {
  private proc: ReturnType<typeof import('@codesandbox/nodebox').Nodebox.prototype.shell.create> | null = null

  constructor(
    private runtime: NodeboxRuntime,
    private terminal: TerminalAdapter
  ) {}

  async connect(): Promise<void> {
    // El terminal escribe → va al stdin del shell
    this.terminal.onData((input) => {
      this.proc?.stdin.write(input)
    })
  }

  async openShell(cwd = '/'): Promise<void> {
    const shell = await this.runtime['nodebox']!.shell.create()
    const proc = shell.run('sh', [], { cwd })
    this.proc = proc as any

    // Output del shell → va al terminal
    proc.stdout.on('data', (data: string) => {
      this.terminal.write(data)
    })
    proc.stderr.on('data', (data: string) => {
      this.terminal.write(`\x1b[31m${data}\x1b[0m`)  // rojo para stderr
    })
  }

  disconnect(): void {
    this.proc = null
  }
}
```

---

### Paso 4 — `script-runner.ts`

```typescript
import type { NodeboxRuntime } from './nodebox-runtime'

export interface RunnerOutput {
  lines: string[]
  exitCode: number
  duration: number
}

export class ScriptRunner {
  constructor(private runtime: NodeboxRuntime) {}

  async run(
    script: string,
    onLine?: (line: string, type: 'out' | 'err') => void
  ): Promise<RunnerOutput> {
    const start = Date.now()
    const lines: string[] = []

    const exitCode = await this.runtime.run({
      script,
      onOutput: (line, type) => {
        lines.push(line)
        onLine?.(line, type === 'stdout' ? 'out' : 'err')
      }
    })

    return { lines, exitCode, duration: Date.now() - start }
  }

  async build(onLine?: (line: string, type: 'out' | 'err') => void): Promise<RunnerOutput> {
    return this.run('build', onLine)
  }

  async test(onLine?: (line: string, type: 'out' | 'err') => void): Promise<RunnerOutput> {
    return this.run('test', onLine)
  }
}
```

---

## Integración con `apps/web`

### Conectar Nodebox al terminal existente

```typescript
// apps/web/src/app/services/node-runtime.service.ts
import { Injectable, signal, inject } from '@angular/core'
import { NodeboxRuntime } from '@vertex/runtime/node'
import { TerminalBridge } from '@vertex/runtime/node'
import { WorkspaceService } from './workspace.service'

@Injectable({ providedIn: 'root' })
export class NodeRuntimeService {
  private workspace = inject(WorkspaceService)
  private runtime: NodeboxRuntime | null = null

  status = signal<'idle' | 'initializing' | 'ready' | 'error'>('idle')
  npmLog = signal<string[]>([])

  async initialize(): Promise<void> {
    this.status.set('initializing')
    try {
      this.runtime = new NodeboxRuntime(this.workspace.virtualFs())
      await this.runtime.init()
      this.status.set('ready')
    } catch (e) {
      this.status.set('error')
      throw e
    }
  }

  async npmInstall(): Promise<void> {
    if (!this.runtime) await this.initialize()
    this.npmLog.set([])
    await this.runtime!.install()
  }

  async runScript(script: string): Promise<void> {
    if (!this.runtime) await this.initialize()
    const runner = new ScriptRunner(this.runtime!)
    await runner.run(script, (line) => {
      this.npmLog.update(logs => [...logs, line])
    })
  }

  connectTerminal(terminalAdapter: TerminalAdapter): TerminalBridge {
    if (!this.runtime) throw new Error('Runtime no inicializado')
    const bridge = new TerminalBridge(this.runtime, terminalAdapter)
    bridge.connect()
    return bridge
  }
}
```

---

## Flujo completo Phase 1→4

```
Usuario abre repo URL
        ↓
Phase 1: GitClient.clone() → archivos en VirtualFS
        ↓
Phase 2: Bundler.build() → dist/ en VirtualFS (para proyectos simples)
        ↓
Phase 4: NodeboxRuntime.init() + install() → dev server real
        ↓
Phase 3: PreviewManager muestra el dev server en iframe
        ↓
Usuario edita → HotReload → iframe actualiza
```

---

## Criterio de "Phase 4 completada"

- [ ] `NodeboxRuntime.init()` arranca sin errores en Chrome y Firefox
- [ ] `npm install` descarga dependencias reales (React, Vite, etc.)
- [ ] `npm run dev` arranca un Vite dev server visible en iframe
- [ ] `npm run build` produce `dist/` que se puede ver en PreviewManager
- [ ] Terminal en `apps/web` conectado a Nodebox vía `TerminalBridge`
- [ ] Editar un archivo con el editor actualiza el dev server automáticamente
- [ ] Nodebox se limpia correctamente al cerrar el workspace
- [ ] Funciona con proyectos React, Vue, y Vite vanilla

## Limitaciones conocidas

- Paquetes con binarios nativos no funcionan (Prisma, better-sqlite3, etc.)
- `child_process.fork()` no soportado
- Sin acceso al filesystem real del OS
- Angular CLI / Next.js SSR necesitan pruebas adicionales
