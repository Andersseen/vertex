# Phase 2 — Bundler (esbuild-wasm)
> **Objetivo:** Buildear proyectos JS/TS/JSX/TSX completos desde el VirtualFS, 100% en browser.
> **Prerrequisito:** Phase 1 completada (`VirtualFS` + `GitClient` funcionando).
> **Duración estimada:** 2-3 semanas
> **Resultado:** `@vertex/runtime/build` — buildeas un proyecto clonado y obtienes `dist/` en VirtualFS.

---

## Instalación

```bash
bun add esbuild-wasm
```

---

## Estructura de archivos a crear

```
packages/frontend/runtime/src/
├── build/
│   ├── bundler.ts              ← Wrapper principal de esbuild-wasm
│   ├── plugins/
│   │   ├── virtual-fs-plugin.ts   ← Resuelve imports desde VirtualFS
│   │   ├── npm-cdn-plugin.ts      ← Resuelve npm packages via esm.sh
│   │   └── index.ts
│   ├── resolver.ts             ← Lógica de resolución de módulos
│   ├── typescript.ts           ← tsconfig.json parsing + TS support
│   └── index.ts
├── types/
│   └── build.types.ts
```

---

## Interfaces clave

### `build.types.ts`
```typescript
export interface BuildConfig {
  // Entry point dentro del VirtualFS
  entryPoint: string        // ej: '/src/main.ts'
  outDir: string            // ej: '/dist'

  // Opciones del proyecto
  format: 'esm' | 'cjs' | 'iife'
  target: 'browser' | 'node' | 'worker'
  minify: boolean
  sourcemap: boolean

  // Cómo resolver npm packages
  npmResolution: 'cdn' | 'nodebox'  // Phase 2: cdn. Phase 4: nodebox
  cdnUrl: string            // default: 'https://esm.sh'

  // tsconfig.json path (opcional)
  tsconfig?: string
}

export interface BuildResult {
  success: boolean
  files: BuildOutputFile[]  // archivos generados en outDir
  errors: BuildError[]
  warnings: BuildWarning[]
  duration: number          // ms
  stats: {
    inputFiles: number
    outputSize: number      // bytes
  }
}

export interface BuildOutputFile {
  path: string
  content: string
  size: number
}

export interface BuildError {
  file: string
  line: number
  column: number
  message: string
}

export interface BuildWarning extends BuildError {}

export type BuildProgressCallback = (phase: 'init' | 'resolve' | 'bundle' | 'write', percent: number) => void

export interface IBundler {
  build(config: BuildConfig, onProgress?: BuildProgressCallback): Promise<BuildResult>
  transform(code: string, loader: 'ts' | 'tsx' | 'js' | 'jsx'): Promise<string>
  dispose(): void
}
```

---

## Implementación paso a paso

### Paso 1 — `plugins/virtual-fs-plugin.ts`

Este plugin es el más crítico: hace que esbuild lea archivos desde el VirtualFS en lugar del sistema de archivos real.

```typescript
import type * as esbuild from 'esbuild-wasm'
import type { IVirtualFS } from '../../types/fs.types'

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css']

export function virtualFsPlugin(fs: IVirtualFS): esbuild.Plugin {
  return {
    name: 'vertex-virtual-fs',
    setup(build) {
      // Interceptar TODOS los imports que vengan del VirtualFS
      build.onResolve({ filter: /.*/ }, async (args) => {
        // Si es relativo, resolver contra el archivo actual
        if (args.path.startsWith('.') || args.path.startsWith('/')) {
          const base = args.importer
            ? args.importer.substring(0, args.importer.lastIndexOf('/'))
            : '/'
          const resolved = resolve(base, args.path)
          const withExt = await findWithExtension(fs, resolved)
          if (withExt) return { path: withExt, namespace: 'vfs' }
        }

        // Si no es relativo → dejar pasar al siguiente plugin (npm-cdn-plugin)
        return undefined
      })

      // Leer archivos desde VirtualFS
      build.onLoad({ filter: /.*/, namespace: 'vfs' }, async (args) => {
        const content = await fs.readFile(args.path)
        const ext = args.path.split('.').pop() ?? 'js'
        const loaderMap: Record<string, esbuild.Loader> = {
          ts: 'ts', tsx: 'tsx', js: 'js', jsx: 'jsx',
          json: 'json', css: 'css',
        }
        return { contents: content, loader: loaderMap[ext] ?? 'js' }
      })
    }
  }
}

function resolve(base: string, relative: string): string {
  if (relative.startsWith('/')) return relative
  const parts = base.split('/').filter(Boolean)
  for (const segment of relative.split('/')) {
    if (segment === '..') parts.pop()
    else if (segment !== '.') parts.push(segment)
  }
  return '/' + parts.join('/')
}

async function findWithExtension(fs: IVirtualFS, path: string): Promise<string | null> {
  // Probar path exacto primero
  if (await fs.exists(path)) return path
  // Probar con extensiones
  for (const ext of EXTENSIONS) {
    if (await fs.exists(path + ext)) return path + ext
  }
  // Probar como directorio/index
  for (const ext of EXTENSIONS) {
    if (await fs.exists(path + '/index' + ext)) return path + '/index' + ext
  }
  return null
}
```

---

### Paso 2 — `plugins/npm-cdn-plugin.ts`

Resuelve `import React from 'react'` → `https://esm.sh/react`

```typescript
import type * as esbuild from 'esbuild-wasm'

interface PkgVersions {
  [name: string]: string
}

export function npmCdnPlugin(
  cdnUrl = 'https://esm.sh',
  versions: PkgVersions = {}
): esbuild.Plugin {
  const cache = new Map<string, string>()

  return {
    name: 'vertex-npm-cdn',
    setup(build) {
      // Capturar imports de node_modules (no relativos, no absolutos)
      build.onResolve({ filter: /^[^./]/ }, (args) => {
        const [name, ...rest] = args.path.split('/')
        const pkg = name.startsWith('@') ? name + '/' + rest.shift() : name
        const sub = rest.join('/')
        const version = versions[pkg] ? `@${versions[pkg]}` : ''
        const url = `${cdnUrl}/${pkg}${version}${sub ? '/' + sub : ''}`
        return { path: url, namespace: 'cdn-url' }
      })

      // Resolver URLs de CDN relativas (imports dentro de paquetes CDN)
      build.onResolve({ filter: /.*/, namespace: 'cdn-url' }, (args) => {
        if (args.path.startsWith('http')) return { path: args.path, namespace: 'cdn-url' }
        const base = new URL(args.importer)
        const resolved = new URL(args.path, base).toString()
        return { path: resolved, namespace: 'cdn-url' }
      })

      // Fetch del CDN
      build.onLoad({ filter: /.*/, namespace: 'cdn-url' }, async (args) => {
        if (cache.has(args.path)) {
          return { contents: cache.get(args.path)!, loader: 'js' }
        }
        const res = await fetch(args.path)
        if (!res.ok) throw new Error(`CDN fetch failed: ${args.path} (${res.status})`)
        const contents = await res.text()
        cache.set(args.path, contents)
        return { contents, loader: 'js' }
      })
    }
  }
}
```

---

### Paso 3 — `resolver.ts`

Lee `package.json` del VirtualFS para extraer las versiones de dependencias.

```typescript
import type { IVirtualFS } from '../types/fs.types'

export interface PackageJson {
  name?: string
  version?: string
  main?: string
  module?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

export async function readPackageJson(fs: IVirtualFS, dir = '/'): Promise<PackageJson> {
  try {
    const content = await fs.readFile(`${dir}/package.json`.replace('//', '/'))
    return JSON.parse(content)
  } catch {
    return {}
  }
}

export function extractDependencyVersions(pkg: PackageJson): Record<string, string> {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  const versions: Record<string, string> = {}
  for (const [name, version] of Object.entries(deps)) {
    // Limpiar semver: "^18.2.0" → "18.2.0"
    versions[name] = version.replace(/^[\^~>=<]/, '').split(' ')[0]
  }
  return versions
}

export function detectFramework(pkg: PackageJson): 'react' | 'vue' | 'angular' | 'svelte' | 'unknown' {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  if (deps['react']) return 'react'
  if (deps['vue']) return 'vue'
  if (deps['@angular/core']) return 'angular'
  if (deps['svelte']) return 'svelte'
  return 'unknown'
}

export function detectEntryPoint(pkg: PackageJson, fs: IVirtualFS): string {
  // Orden de preferencia para entry points
  const candidates = [
    '/src/main.tsx', '/src/main.ts', '/src/main.jsx', '/src/main.js',
    '/src/index.tsx', '/src/index.ts', '/src/index.jsx', '/src/index.js',
    '/index.html',
  ]
  // En una sesión real, iterar con await
  return pkg.module ?? pkg.main ?? candidates[0]
}
```

---

### Paso 4 — `bundler.ts` (clase principal)

```typescript
import * as esbuild from 'esbuild-wasm'
import type { IVirtualFS } from '../types/fs.types'
import type { BuildConfig, BuildResult, BuildProgressCallback, IBundler } from '../types/build.types'
import { virtualFsPlugin } from './plugins/virtual-fs-plugin'
import { npmCdnPlugin } from './plugins/npm-cdn-plugin'
import { readPackageJson, extractDependencyVersions } from './resolver'

let initialized = false

export class Bundler implements IBundler {
  private fs: IVirtualFS

  constructor(fs: IVirtualFS) {
    this.fs = fs
  }

  private async init(): Promise<void> {
    if (initialized) return
    await esbuild.initialize({
      // Cargar el WASM desde CDN (no incluirlo en el bundle)
      wasmURL: 'https://esm.sh/esbuild-wasm/esbuild.wasm',
      worker: true,  // Correr en Web Worker para no bloquear UI
    })
    initialized = true
  }

  async build(config: BuildConfig, onProgress?: BuildProgressCallback): Promise<BuildResult> {
    const start = Date.now()
    await this.init()
    onProgress?.('init', 10)

    // Leer package.json para versiones de deps
    const pkg = await readPackageJson(this.fs, '/')
    const versions = extractDependencyVersions(pkg)
    onProgress?.('resolve', 30)

    const plugins: esbuild.Plugin[] = [
      virtualFsPlugin(this.fs),
    ]

    if (config.npmResolution === 'cdn') {
      plugins.push(npmCdnPlugin(config.cdnUrl, versions))
    }

    onProgress?.('bundle', 50)

    let result: esbuild.BuildResult
    try {
      result = await esbuild.build({
        entryPoints: [config.entryPoint],
        bundle: true,
        format: config.format,
        target: config.target === 'browser' ? ['chrome110', 'firefox110', 'safari16'] : ['node18'],
        minify: config.minify,
        sourcemap: config.sourcemap ? 'inline' : false,
        write: false,  // No escribir a disco, capturar en memoria
        plugins,
        logLevel: 'silent',
      })
    } catch (e: unknown) {
      const errors = (e as esbuild.BuildFailure).errors ?? []
      return {
        success: false,
        files: [],
        errors: errors.map(err => ({
          file: err.location?.file ?? '',
          line: err.location?.line ?? 0,
          column: err.location?.column ?? 0,
          message: err.text,
        })),
        warnings: [],
        duration: Date.now() - start,
        stats: { inputFiles: 0, outputSize: 0 }
      }
    }

    onProgress?.('write', 80)

    // Escribir output al VirtualFS
    const outputFiles: BuildResult['files'] = []
    for (const file of result.outputFiles ?? []) {
      const outPath = file.path.replace('/app', config.outDir)
      await this.fs.writeFile(outPath, file.text)
      outputFiles.push({ path: outPath, content: file.text, size: file.text.length })
    }

    onProgress?.('write', 100)

    return {
      success: result.errors.length === 0,
      files: outputFiles,
      errors: result.errors.map(e => ({
        file: e.location?.file ?? '',
        line: e.location?.line ?? 0,
        column: e.location?.column ?? 0,
        message: e.text,
      })),
      warnings: result.warnings.map(w => ({
        file: w.location?.file ?? '',
        line: w.location?.line ?? 0,
        column: w.location?.column ?? 0,
        message: w.text,
      })),
      duration: Date.now() - start,
      stats: {
        inputFiles: result.outputFiles?.length ?? 0,
        outputSize: outputFiles.reduce((sum, f) => sum + f.size, 0),
      }
    }
  }

  async transform(code: string, loader: 'ts' | 'tsx' | 'js' | 'jsx'): Promise<string> {
    await this.init()
    const result = await esbuild.transform(code, { loader, minify: false })
    return result.code
  }

  dispose(): void {
    if (initialized) {
      esbuild.stop()
      initialized = false
    }
  }
}
```

---

### Paso 5 — `typescript.ts` (soporte tsconfig)

```typescript
import type { IVirtualFS } from '../types/fs.types'

interface TsConfig {
  compilerOptions?: {
    target?: string
    module?: string
    jsx?: 'react' | 'react-jsx' | 'preserve'
    strict?: boolean
    paths?: Record<string, string[]>
    baseUrl?: string
  }
}

export async function readTsConfig(fs: IVirtualFS, dir = '/'): Promise<TsConfig> {
  const path = `${dir}/tsconfig.json`.replace('//', '/')
  try {
    const content = await fs.readFile(path)
    // Eliminar comentarios antes de parsear (tsconfig permite comentarios)
    const clean = content.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
    return JSON.parse(clean)
  } catch {
    return {}
  }
}

export function tsConfigToEsbuildTarget(tsConfig: TsConfig): string {
  const target = tsConfig.compilerOptions?.target?.toLowerCase()
  const map: Record<string, string> = {
    'es2020': 'es2020', 'es2021': 'es2021', 'es2022': 'es2022',
    'esnext': 'esnext', 'es6': 'es6', 'es5': 'es5'
  }
  return map[target ?? ''] ?? 'es2020'
}
```

---

## Tests a escribir

### `tests/bundler.test.ts`
```typescript
import { describe, test, expect, beforeEach } from 'bun:test'
import { VirtualFS } from '../src/fs/virtual-fs'
import { Bundler } from '../src/build/bundler'

describe('Bundler', () => {
  let fs: VirtualFS
  let bundler: Bundler

  beforeEach(() => {
    fs = new VirtualFS('memory')
    bundler = new Bundler(fs)
  })

  test('bundle TypeScript simple', async () => {
    await fs.writeFile('/src/main.ts', `
      const greeting: string = 'Hello from Vertex'
      document.body.innerHTML = greeting
    `)
    await fs.writeFile('/package.json', JSON.stringify({ name: 'test', dependencies: {} }))

    const result = await bundler.build({
      entryPoint: '/src/main.ts',
      outDir: '/dist',
      format: 'esm',
      target: 'browser',
      minify: false,
      sourcemap: false,
      npmResolution: 'cdn',
      cdnUrl: 'https://esm.sh',
    })

    expect(result.success).toBe(true)
    expect(result.files.length).toBeGreaterThan(0)
    expect(result.errors).toHaveLength(0)
    const distContent = await fs.readFile('/dist/main.js')
    expect(distContent).toContain('Hello from Vertex')
  })

  test('transform TSX', async () => {
    const code = `const App = () => <div>Hello</div>`
    const output = await bundler.transform(code, 'tsx')
    expect(output).toContain('React.createElement')
  })

  test('build errors reported correctly', async () => {
    await fs.writeFile('/src/main.ts', `const x: string = 123`) // error de tipo
    const result = await bundler.build({
      entryPoint: '/src/main.ts',
      outDir: '/dist',
      format: 'esm',
      target: 'browser',
      minify: false,
      sourcemap: false,
      npmResolution: 'cdn',
      cdnUrl: 'https://esm.sh',
    })
    // esbuild no reporta errores de tipo, solo sintaxis
    // Esto debería buildear (esbuild ignora type errors)
    expect(result.success).toBe(true)
  })
})
```

---

## Integración con `apps/web`

Panel de build en la web app. Añadir al workspace:

```typescript
// apps/web/src/app/components/build-panel/build-panel.ts
import { Component, signal, inject } from '@angular/core'
import { Bundler } from '@vertex/runtime/build'
import { WorkspaceService } from '../../services/workspace.service'

@Component({
  selector: 'app-build-panel',
  template: `
    <div class="build-panel">
      <button (click)="runBuild()" [disabled]="building()">
        {{ building() ? 'Building...' : 'Build' }}
      </button>

      @if (progress()) {
        <div class="progress">{{ progress() }}</div>
      }

      @if (result()) {
        <div [class]="result()!.success ? 'success' : 'error'">
          @if (result()!.success) {
            ✓ Build OK — {{ result()!.stats.outputSize | number }} bytes
            in {{ result()!.duration }}ms
          } @else {
            @for (err of result()!.errors; track err.message) {
              <p>{{ err.file }}:{{ err.line }} — {{ err.message }}</p>
            }
          }
        </div>
      }
    </div>
  `
})
export class BuildPanel {
  private workspace = inject(WorkspaceService)
  building = signal(false)
  progress = signal('')
  result = signal<BuildResult | null>(null)

  async runBuild() {
    this.building.set(true)
    const bundler = new Bundler(this.workspace.virtualFs())
    this.result.set(await bundler.build(
      {
        entryPoint: '/src/main.ts',
        outDir: '/dist',
        format: 'esm',
        target: 'browser',
        minify: true,
        sourcemap: false,
        npmResolution: 'cdn',
        cdnUrl: 'https://esm.sh',
      },
      (phase, percent) => this.progress.set(`${phase} ${percent}%`)
    ))
    this.building.set(false)
  }
}
```

---

## Criterio de "Phase 2 completada"

- [ ] Buildear un proyecto React con TypeScript desde VirtualFS sin errores
- [ ] npm packages resueltos via `esm.sh` (React, lodash, etc.)
- [ ] Archivos de output escritos en `/dist` del VirtualFS
- [ ] Errores de build reportados con línea y columna
- [ ] `Bundler.transform()` transforma TSX correctamente
- [ ] Build de un "Hello World" en `<200ms`
- [ ] Panel de build visible en `apps/web`
- [ ] Exports actualizados en `index.ts`

---

## Limitaciones conocidas de esta fase

- Solo paquetes JS puro via CDN (no nativos como Prisma)
- No soporta `npm install` real (Phase 4)
- CSS Modules no soportados aún (Phase 6)
- Angular/Vite builds no soportados (necesitan Nodebox, Phase 4)
- Tailwind JIT no soportado aún (Phase 6)
