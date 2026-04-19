# Phase 3 — Preview (Service Worker + iframe)
> **Objetivo:** Ver la app buildeada corriendo en un iframe, con hot reload al editar archivos.
> **Prerrequisito:** Phase 1 + Phase 2 completadas.
> **Duración estimada:** 2-3 semanas
> **Resultado:** El editor muestra una preview en vivo de la app mientras editas.

---

## Concepto clave

```
VirtualFS (dist/)
    ↓
Service Worker intercepta fetch('http://localhost:3000/index.js')
    ↓
Devuelve el contenido desde VirtualFS (sin red real)
    ↓
iframe carga la app como si tuviese un servidor real
```

El truco es que el Service Worker simula un servidor HTTP dentro del browser. El iframe no sabe que no hay servidor real.

---

## Estructura de archivos a crear

```
packages/frontend/runtime/src/
├── preview/
│   ├── service-worker/
│   │   ├── sw.ts              ← El Service Worker en sí (archivo separado)
│   │   └── sw-manager.ts      ← Registra y comunica con el SW
│   ├── iframe-manager.ts      ← Gestiona el iframe y hot reload
│   ├── hot-reload.ts          ← Detecta cambios y notifica iframe
│   ├── template.ts            ← Genera index.html si no existe
│   └── index.ts
├── types/
│   └── preview.types.ts
```

**IMPORTANTE:** `sw.ts` debe compilarse como archivo separado e independiente, no como parte del bundle principal. Necesita su propio entry point en el build.

---

## Interfaces clave

### `preview.types.ts`
```typescript
export interface PreviewConfig {
  // URL base que el iframe usará
  baseUrl: string           // ej: 'http://localhost:3000'
  // Directorio en VirtualFS donde están los archivos buildeados
  serveDir: string          // ej: '/dist'
  // Entry point HTML
  indexHtml?: string        // default: '/dist/index.html'
}

export interface PreviewSession {
  url: string               // URL para poner en el iframe src
  reload(): void            // Fuerza recarga completa del iframe
  hotReload(paths: string[]): void  // HMR: actualiza módulos sin recargar
  destroy(): void           // Limpia el SW y el iframe
}

export interface IPreviewManager {
  start(config: PreviewConfig): Promise<PreviewSession>
  stop(): Promise<void>
  isRunning(): boolean
}

// Mensajes entre main thread y Service Worker
export type SWMessage =
  | { type: 'MOUNT_FILES'; files: Record<string, string> }
  | { type: 'UPDATE_FILE'; path: string; content: string }
  | { type: 'DELETE_FILE'; path: string }
  | { type: 'CLEAR' }
  | { type: 'PING' }

export type SWResponse =
  | { type: 'READY' }
  | { type: 'PONG' }
  | { type: 'FILE_UPDATED'; path: string }
```

---

## Implementación paso a paso

### Paso 1 — `service-worker/sw.ts`

Este archivo corre en el contexto del Service Worker, no en la app principal.

```typescript
// Este archivo se compila por separado como sw.js
// NO importar nada de @vertex/runtime aquí

declare const self: ServiceWorkerGlobalScope

// Mapa en memoria del SW: path → content
const virtualFiles = new Map<string, string>()

// Instalar SW inmediatamente
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Interceptar todas las peticiones HTTP
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Solo interceptar peticiones al "servidor virtual"
  // (localhost:3000 o el origin configurado)
  if (!shouldIntercept(url)) return

  event.respondWith(handleRequest(url.pathname))
})

function shouldIntercept(url: URL): boolean {
  return url.hostname === 'localhost' && url.port === '3000'
}

async function handleRequest(pathname: string): Promise<Response> {
  // Buscar el archivo en el mapa virtual
  let path = pathname === '/' ? '/index.html' : pathname

  // Intentar encontrar el archivo
  let content = virtualFiles.get(path)

  // Si no existe y no tiene extensión, probar index.html (SPA routing)
  if (!content && !path.includes('.')) {
    content = virtualFiles.get('/index.html')
    path = '/index.html'
  }

  if (!content) {
    return new Response(`File not found: ${path}`, {
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': getMimeType(path),
      'Cache-Control': 'no-cache',
    }
  })
}

function getMimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  const types: Record<string, string> = {
    html: 'text/html; charset=utf-8',
    js: 'application/javascript',
    mjs: 'application/javascript',
    css: 'text/css',
    json: 'application/json',
    png: 'image/png',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    woff2: 'font/woff2',
  }
  return types[ext ?? ''] ?? 'text/plain'
}

// Escuchar mensajes del main thread para actualizar archivos
self.addEventListener('message', (event) => {
  const msg = event.data as import('../types/preview.types').SWMessage

  switch (msg.type) {
    case 'MOUNT_FILES':
      for (const [path, content] of Object.entries(msg.files)) {
        virtualFiles.set(path, content)
      }
      break

    case 'UPDATE_FILE':
      virtualFiles.set(msg.path, msg.content)
      // Notificar a todos los clientes que un archivo cambió
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'FILE_UPDATED', path: msg.path })
        })
      })
      break

    case 'DELETE_FILE':
      virtualFiles.delete(msg.path)
      break

    case 'CLEAR':
      virtualFiles.clear()
      break

    case 'PING':
      event.source?.postMessage({ type: 'PONG' })
      break
  }
})
```

---

### Paso 2 — `service-worker/sw-manager.ts`

```typescript
import type { SWMessage, SWResponse } from '../../types/preview.types'

export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private controller: ServiceWorker | null = null

  async register(swUrl: string): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Workers no soportados en este browser')
    }

    this.registration = await navigator.serviceWorker.register(swUrl, {
      scope: '/',
      type: 'module'
    })

    // Esperar a que el SW esté activo
    await this.waitForActive()
    this.controller = navigator.serviceWorker.controller
  }

  async send(message: SWMessage): Promise<void> {
    if (!this.controller) throw new Error('Service Worker no activo')
    this.controller.postMessage(message)
  }

  async sendAndWait(message: SWMessage, expectedResponse: SWResponse['type']): Promise<void> {
    return new Promise((resolve) => {
      const channel = new MessageChannel()
      channel.port1.onmessage = (e) => {
        if (e.data.type === expectedResponse) resolve()
      }
      this.controller!.postMessage(message, [channel.port2])
    })
  }

  async mountFiles(files: Record<string, string>): Promise<void> {
    await this.send({ type: 'MOUNT_FILES', files })
  }

  async updateFile(path: string, content: string): Promise<void> {
    await this.send({ type: 'UPDATE_FILE', path, content })
  }

  async clear(): Promise<void> {
    await this.send({ type: 'CLEAR' })
  }

  async unregister(): Promise<void> {
    await this.registration?.unregister()
    this.registration = null
    this.controller = null
  }

  private async waitForActive(): Promise<void> {
    const sw = this.registration!
    if (sw.active) return

    return new Promise((resolve) => {
      const worker = sw.installing ?? sw.waiting
      if (!worker) { resolve(); return }
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') resolve()
      })
    })
  }
}
```

---

### Paso 3 — `template.ts`

Genera un `index.html` si el proyecto no lo tiene.

```typescript
export function generateIndexHtml(options: {
  title: string
  entryScript: string  // ej: '/main.js'
  cssFiles?: string[]  // ej: ['/main.css']
}): string {
  const cssLinks = (options.cssFiles ?? [])
    .map(css => `  <link rel="stylesheet" href="${css}">`)
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
${cssLinks}
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${options.entryScript}"></script>
</body>
</html>`
}
```

---

### Paso 4 — `hot-reload.ts`

```typescript
import type { IVirtualFS, WatchCallback } from '../types/fs.types'
import type { ServiceWorkerManager } from './service-worker/sw-manager'

export class HotReload {
  private unwatchers: Array<() => void> = []
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private pendingChanges = new Set<string>()

  constructor(
    private fs: IVirtualFS,
    private swManager: ServiceWorkerManager,
    private iframeRef: { contentWindow: Window | null }
  ) {}

  start(watchDir = '/dist'): void {
    const unwatch = this.fs.watch(watchDir, this.handleChange.bind(this))
    this.unwatchers.push(unwatch)
  }

  stop(): void {
    this.unwatchers.forEach(fn => fn())
    this.unwatchers = []
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
  }

  private handleChange: WatchCallback = (event, path) => {
    if (event === 'delete') return
    this.pendingChanges.add(path)

    // Debounce: esperar 50ms para agrupar cambios simultáneos
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => this.flushChanges(), 50)
  }

  private async flushChanges(): Promise<void> {
    const paths = [...this.pendingChanges]
    this.pendingChanges.clear()

    for (const path of paths) {
      const content = await this.fs.readFile(path)
      await this.swManager.updateFile(path, content)
    }

    // Notificar al iframe para que recargue los módulos cambiados
    this.iframeRef.contentWindow?.postMessage(
      { type: 'HMR_UPDATE', paths },
      '*'
    )
  }
}
```

---

### Paso 5 — `iframe-manager.ts` (clase principal)

```typescript
import { ServiceWorkerManager } from './service-worker/sw-manager'
import { HotReload } from './hot-reload'
import { generateIndexHtml } from './template'
import type { IVirtualFS } from '../types/fs.types'
import type { PreviewConfig, PreviewSession, IPreviewManager } from '../types/preview.types'

export class PreviewManager implements IPreviewManager {
  private swManager = new ServiceWorkerManager()
  private hotReload: HotReload | null = null
  private running = false

  constructor(
    private fs: IVirtualFS,
    // URL donde se sirve el sw.js compilado
    private swUrl = '/vertex-sw.js'
  ) {}

  async start(config: PreviewConfig): Promise<PreviewSession> {
    await this.swManager.register(this.swUrl)

    // Montar todos los archivos del directorio de build en el SW
    const files = await this.collectFiles(config.serveDir)

    // Generar index.html si no existe
    if (!files['/index.html']) {
      files['/index.html'] = generateIndexHtml({
        title: 'Vertex Preview',
        entryScript: '/main.js',
        cssFiles: files['/main.css'] ? ['/main.css'] : []
      })
    }

    await this.swManager.mountFiles(files)
    this.running = true

    // Crear iframe manager
    let iframeEl: HTMLIFrameElement | null = null
    const iframeRef = { contentWindow: null as Window | null }

    // Iniciar hot reload
    this.hotReload = new HotReload(this.fs, this.swManager, iframeRef)
    this.hotReload.start(config.serveDir)

    return {
      url: `${config.baseUrl}/index.html`,

      reload: () => {
        if (iframeEl) iframeEl.src = iframeEl.src
      },

      hotReload: async (paths: string[]) => {
        for (const path of paths) {
          const content = await this.fs.readFile(path)
          await this.swManager.updateFile(path, content)
        }
      },

      destroy: () => {
        this.stop()
      }
    }
  }

  async stop(): Promise<void> {
    this.hotReload?.stop()
    await this.swManager.clear()
    await this.swManager.unregister()
    this.running = false
  }

  isRunning(): boolean {
    return this.running
  }

  private async collectFiles(dir: string): Promise<Record<string, string>> {
    const result: Record<string, string> = {}
    await this.collectRecursive(dir, result)
    return result
  }

  private async collectRecursive(dir: string, result: Record<string, string>): Promise<void> {
    const entries = await this.fs.readDir(dir)
    for (const entry of entries) {
      if (entry.type === 'file') {
        const content = await this.fs.readFile(entry.path)
        // Normalizar path para el SW (relativo a serveDir → absoluto desde /)
        const swPath = entry.path.replace(dir, '') || '/' + entry.path.split('/').pop()
        result[swPath] = content
      } else {
        await this.collectRecursive(entry.path, result)
      }
    }
  }
}
```

---

## Componente Angular para la web app

```typescript
// apps/web/src/app/components/preview-panel/preview-panel.ts
import {
  Component, signal, ViewChild, ElementRef,
  AfterViewInit, OnDestroy, inject, ChangeDetectionStrategy
} from '@angular/core'
import { PreviewManager } from '@vertex/runtime/preview'
import { WorkspaceService } from '../../services/workspace.service'

@Component({
  selector: 'app-preview-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="preview-panel">
      <div class="preview-toolbar">
        <button (click)="togglePreview()">
          {{ isRunning() ? 'Stop Preview' : 'Start Preview' }}
        </button>
        <button (click)="reload()" [disabled]="!isRunning()">Reload</button>
        <span class="preview-url">{{ previewUrl() }}</span>
      </div>

      @if (isRunning()) {
        <iframe
          #previewFrame
          [src]="previewUrl()"
          class="preview-frame"
          sandbox="allow-scripts allow-same-origin allow-forms"
        ></iframe>
      } @else {
        <div class="preview-placeholder">
          <p>Haz build y luego inicia el preview</p>
        </div>
      }
    </div>
  `,
  styles: `
    .preview-panel { display: flex; flex-direction: column; height: 100%; }
    .preview-frame { flex: 1; border: none; width: 100%; }
    .preview-toolbar { display: flex; gap: 8px; padding: 8px; border-bottom: 1px solid #333; }
    .preview-placeholder { flex: 1; display: flex; align-items: center; justify-content: center; color: #666; }
  `
})
export class PreviewPanel implements AfterViewInit, OnDestroy {
  @ViewChild('previewFrame') frameRef!: ElementRef<HTMLIFrameElement>

  private workspace = inject(WorkspaceService)
  private manager: PreviewManager | null = null
  private session: Awaited<ReturnType<PreviewManager['start']>> | null = null

  isRunning = signal(false)
  previewUrl = signal('about:blank')

  ngAfterViewInit() {
    this.manager = new PreviewManager(this.workspace.virtualFs())
  }

  async togglePreview() {
    if (this.isRunning()) {
      await this.manager?.stop()
      this.isRunning.set(false)
      this.previewUrl.set('about:blank')
    } else {
      this.session = await this.manager!.start({
        baseUrl: 'http://localhost:3000',
        serveDir: '/dist',
      })
      this.previewUrl.set(this.session.url)
      this.isRunning.set(true)
    }
  }

  reload() { this.session?.reload() }

  ngOnDestroy() { this.manager?.stop() }
}
```

---

## Notas importantes sobre Service Workers

### El SW debe servirse desde el mismo origen
El archivo `sw.js` debe estar accesible como recurso estático. En `apps/web`:

```
apps/web/public/
  vertex-sw.js      ← sw.ts compilado aquí
```

Añadir en `angular.json`:
```json
{
  "assets": ["public/vertex-sw.js"]
}
```

### Headers necesarios para SharedArrayBuffer
Para hot reload avanzado (y Nodebox en Phase 4), necesitarás estos headers en el servidor:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

En Cloudflare Workers/Pages, configurar en `_headers`:
```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

---

## Criterio de "Phase 3 completada"

- [ ] Service Worker se registra sin errores
- [ ] Un `index.html` + `main.js` en VirtualFS se sirve en el iframe
- [ ] Editar un archivo y guardar recarga la preview automáticamente (hot reload)
- [ ] SPA routing funciona en el iframe (no hay 404 en rutas)
- [ ] El SW se limpia correctamente al desmontar el componente
- [ ] Funciona en Chrome, Firefox y Safari
- [ ] Panel de preview visible y funcional en `apps/web`
