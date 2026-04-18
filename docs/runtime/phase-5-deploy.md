# Phase 5 — Deploy Adapters
> **Objetivo:** Subir el `dist/` del VirtualFS directamente a Cloudflare Pages o Workers desde el browser.
> **Prerrequisito:** Phase 1 (VirtualFS) + Phase 2 o 4 (para tener un dist/ real).
> **Duración estimada:** 1 semana
> **Resultado:** Botón "Deploy" en el IDE que sube la app a Cloudflare en segundos.

---

## Concepto

```
VirtualFS (/dist/)
    ↓
DeployAdapter.deploy()
    ↓
fetch() directo al Cloudflare API
    ↓
URL pública lista
```

Todo ocurre desde el browser. Solo necesitas un token de API de Cloudflare.

---

## Estructura de archivos a crear

```
packages/frontend/runtime/src/
├── deploy/
│   ├── adapters/
│   │   ├── cloudflare-pages.ts    ← Deploy a CF Pages
│   │   ├── cloudflare-workers.ts  ← Deploy a CF Workers (SSR)
│   │   └── base.ts                ← Clase base / interfaz
│   ├── deploy-manager.ts          ← Orquesta el proceso completo
│   └── index.ts
├── types/
│   └── deploy.types.ts
```

---

## Interfaces clave

### `deploy.types.ts`
```typescript
export interface DeployConfig {
  provider: 'cloudflare-pages' | 'cloudflare-workers'
  token: string             // API token de Cloudflare
  accountId: string
  // Cloudflare Pages
  projectName?: string      // nombre del proyecto en CF Pages
  branch?: string           // default: 'main'
  // Cloudflare Workers
  workerName?: string
  // Directorio a subir
  distDir: string           // ej: '/dist' en VirtualFS
}

export interface DeployResult {
  success: boolean
  url?: string              // URL pública del deploy
  deploymentId?: string
  error?: string
  duration: number
  filesUploaded: number
}

export type DeployProgressCallback = (
  phase: 'preparing' | 'uploading' | 'deploying' | 'done',
  percent: number,
  message?: string
) => void

export interface IDeployAdapter {
  deploy(
    files: Record<string, Uint8Array | string>,
    config: DeployConfig,
    onProgress?: DeployProgressCallback
  ): Promise<DeployResult>
}
```

---

## Implementación paso a paso

### Paso 1 — `adapters/base.ts`

```typescript
import type { IVirtualFS } from '../../types/fs.types'

export async function collectDistFiles(
  fs: IVirtualFS,
  distDir: string
): Promise<Record<string, string>> {
  const files: Record<string, string> = {}
  await collectRecursive(fs, distDir, distDir, files)
  return files
}

async function collectRecursive(
  fs: IVirtualFS,
  dir: string,
  rootDir: string,
  result: Record<string, string>
): Promise<void> {
  const entries = await fs.readDir(dir)
  for (const entry of entries) {
    if (entry.type === 'file') {
      const content = await fs.readFile(entry.path)
      // Path relativo desde distDir: '/dist/index.html' → '/index.html'
      const relativePath = entry.path.replace(rootDir, '') || '/' + entry.name
      result[relativePath] = content
    } else {
      await collectRecursive(fs, entry.path, rootDir, result)
    }
  }
}
```

---

### Paso 2 — `adapters/cloudflare-pages.ts`

La API de CF Pages acepta un `FormData` con todos los archivos del deploy.

```typescript
import type { DeployConfig, DeployResult, DeployProgressCallback, IDeployAdapter } from '../../types/deploy.types'

const CF_API = 'https://api.cloudflare.com/client/v4'

export class CloudflarePagesAdapter implements IDeployAdapter {
  async deploy(
    files: Record<string, string>,
    config: DeployConfig,
    onProgress?: DeployProgressCallback
  ): Promise<DeployResult> {
    const start = Date.now()
    onProgress?.('preparing', 10, 'Preparando archivos...')

    // 1. Crear el proyecto si no existe
    await this.ensureProject(config)

    onProgress?.('uploading', 30, `Subiendo ${Object.keys(files).length} archivos...`)

    // 2. Crear un nuevo deployment
    const formData = new FormData()

    // CF Pages espera un manifest y los archivos como blobs
    const manifest: Record<string, string> = {}

    for (const [path, content] of Object.entries(files)) {
      const blob = new Blob([content], { type: this.getMimeType(path) })
      // CF Pages usa el hash del archivo como clave
      const hash = await this.hashContent(content)
      manifest[path] = hash
      formData.append(hash, blob, path.slice(1))  // sin leading slash
    }

    formData.append('manifest', JSON.stringify(manifest))

    onProgress?.('deploying', 60, 'Desplegando...')

    const res = await fetch(
      `${CF_API}/accounts/${config.accountId}/pages/projects/${config.projectName}/deployments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
        },
        body: formData,
      }
    )

    if (!res.ok) {
      const err = await res.json()
      return {
        success: false,
        error: err.errors?.[0]?.message ?? `CF API error: ${res.status}`,
        duration: Date.now() - start,
        filesUploaded: 0,
      }
    }

    const data = await res.json()
    onProgress?.('done', 100, 'Desplegado!')

    return {
      success: true,
      url: data.result.url,
      deploymentId: data.result.id,
      duration: Date.now() - start,
      filesUploaded: Object.keys(files).length,
    }
  }

  private async ensureProject(config: DeployConfig): Promise<void> {
    // Verificar si el proyecto existe
    const res = await fetch(
      `${CF_API}/accounts/${config.accountId}/pages/projects/${config.projectName}`,
      { headers: { Authorization: `Bearer ${config.token}` } }
    )

    if (res.status === 404) {
      // Crear proyecto
      await fetch(
        `${CF_API}/accounts/${config.accountId}/pages/projects`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: config.projectName,
            production_branch: config.branch ?? 'main',
          }),
        }
      )
    }
  }

  private async hashContent(content: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
  }

  private getMimeType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase()
    const types: Record<string, string> = {
      html: 'text/html', js: 'application/javascript', mjs: 'application/javascript',
      css: 'text/css', json: 'application/json', png: 'image/png',
      svg: 'image/svg+xml', ico: 'image/x-icon', woff2: 'font/woff2',
      txt: 'text/plain', xml: 'application/xml',
    }
    return types[ext ?? ''] ?? 'application/octet-stream'
  }
}
```

---

### Paso 3 — `adapters/cloudflare-workers.ts`

Para apps SSR (AnalogJS, Next.js edge, etc.) que generan un `worker.js`.

```typescript
import type { DeployConfig, DeployResult, DeployProgressCallback, IDeployAdapter } from '../../types/deploy.types'

const CF_API = 'https://api.cloudflare.com/client/v4'

export class CloudflareWorkersAdapter implements IDeployAdapter {
  async deploy(
    files: Record<string, string>,
    config: DeployConfig,
    onProgress?: DeployProgressCallback
  ): Promise<DeployResult> {
    const start = Date.now()
    onProgress?.('preparing', 10, 'Preparando worker...')

    // Buscar el archivo worker principal
    const workerScript = files['/worker.js'] ?? files['/_worker.js'] ?? files['/index.js']
    if (!workerScript) {
      return {
        success: false,
        error: 'No se encontró worker.js en el dist/',
        duration: Date.now() - start,
        filesUploaded: 0,
      }
    }

    onProgress?.('uploading', 40, 'Subiendo worker...')

    const formData = new FormData()
    formData.append(
      'metadata',
      JSON.stringify({
        main_module: 'worker.js',
        compatibility_date: new Date().toISOString().slice(0, 10),
      })
    )
    formData.append('worker.js', new Blob([workerScript], { type: 'application/javascript+module' }), 'worker.js')

    onProgress?.('deploying', 70, 'Desplegando worker...')

    const res = await fetch(
      `${CF_API}/accounts/${config.accountId}/workers/scripts/${config.workerName}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${config.token}` },
        body: formData,
      }
    )

    if (!res.ok) {
      const err = await res.json()
      return {
        success: false,
        error: err.errors?.[0]?.message ?? `CF API error: ${res.status}`,
        duration: Date.now() - start,
        filesUploaded: 0,
      }
    }

    onProgress?.('done', 100, 'Worker desplegado!')

    return {
      success: true,
      url: `https://${config.workerName}.${config.accountId.slice(0, 8)}.workers.dev`,
      duration: Date.now() - start,
      filesUploaded: 1,
    }
  }
}
```

---

### Paso 4 — `deploy-manager.ts`

```typescript
import type { IVirtualFS } from '../types/fs.types'
import type { DeployConfig, DeployResult, DeployProgressCallback } from '../types/deploy.types'
import { CloudflarePagesAdapter } from './adapters/cloudflare-pages'
import { CloudflareWorkersAdapter } from './adapters/cloudflare-workers'
import { collectDistFiles } from './adapters/base'

export class DeployManager {
  constructor(private fs: IVirtualFS) {}

  async deploy(
    config: DeployConfig,
    onProgress?: DeployProgressCallback
  ): Promise<DeployResult> {
    const files = await collectDistFiles(this.fs, config.distDir)

    if (Object.keys(files).length === 0) {
      return {
        success: false,
        error: `No se encontraron archivos en ${config.distDir}. Haz build primero.`,
        duration: 0,
        filesUploaded: 0,
      }
    }

    const adapter = config.provider === 'cloudflare-pages'
      ? new CloudflarePagesAdapter()
      : new CloudflareWorkersAdapter()

    return adapter.deploy(files, config, onProgress)
  }
}
```

---

## Componente Angular — Panel de Deploy

```typescript
// apps/web/src/app/components/deploy-panel/deploy-panel.ts
import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { DeployManager } from '@vertex/runtime/deploy'
import { WorkspaceService } from '../../services/workspace.service'
import type { DeployConfig, DeployResult } from '@vertex/runtime'

@Component({
  selector: 'app-deploy-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="deploy-panel">
      <h3>Deploy</h3>

      <div class="form-group">
        <label>CF API Token</label>
        <input type="password" [(ngModel)]="token" placeholder="Token de Cloudflare" />
      </div>

      <div class="form-group">
        <label>Account ID</label>
        <input [(ngModel)]="accountId" placeholder="Tu Account ID" />
      </div>

      <div class="form-group">
        <label>Project Name</label>
        <input [(ngModel)]="projectName" placeholder="nombre-del-proyecto" />
      </div>

      <button
        (click)="deploy()"
        [disabled]="deploying() || !token || !accountId"
      >
        {{ deploying() ? progress() : 'Deploy to Cloudflare Pages' }}
      </button>

      @if (result()) {
        <div [class]="result()!.success ? 'result success' : 'result error'">
          @if (result()!.success) {
            ✓ Desplegado en {{ result()!.duration }}ms
            <a [href]="result()!.url" target="_blank">{{ result()!.url }}</a>
          } @else {
            Error: {{ result()!.error }}
          }
        </div>
      }
    </div>
  `
})
export class DeployPanel {
  private workspace = inject(WorkspaceService)

  token = ''
  accountId = ''
  projectName = ''

  deploying = signal(false)
  progress = signal('Desplegando...')
  result = signal<DeployResult | null>(null)

  async deploy() {
    this.deploying.set(true)
    this.result.set(null)

    const manager = new DeployManager(this.workspace.virtualFs())
    const config: DeployConfig = {
      provider: 'cloudflare-pages',
      token: this.token,
      accountId: this.accountId,
      projectName: this.projectName,
      distDir: '/dist',
    }

    this.result.set(
      await manager.deploy(config, (phase, percent, msg) => {
        this.progress.set(`${msg ?? phase} (${percent}%)`)
      })
    )

    this.deploying.set(false)
  }
}
```

---

## Seguridad importante

**NUNCA guardar el CF token en localStorage o VirtualFS.** Solo en memoria de sesión.

Para Devflare (producción), el token se gestiona en el CF Worker backend, nunca en frontend:
```
Browser → CF Worker (guarda token cifrado en KV) → CF API
```

En el IDE (uso personal/development), el usuario pega su token directo — es aceptable.

---

## Criterio de "Phase 5 completada"

- [ ] Deploy de un React app estático a CF Pages desde el browser en < 30s
- [ ] El deployment retorna una URL pública funcional
- [ ] Errores de API de CF reportados claramente al usuario
- [ ] El CF Workers adapter sube un `worker.js` correctamente
- [ ] Panel de deploy visible en `apps/web` con progreso en tiempo real
- [ ] Exports actualizados en `index.ts`

---

## Testing

Para testear sin gastar deploys reales, mockear el CF API:

```typescript
// tests/deploy.test.ts
import { describe, test, expect, mock } from 'bun:test'
import { DeployManager } from '../src/deploy/deploy-manager'
import { VirtualFS } from '../src/fs/virtual-fs'

describe('DeployManager', () => {
  test('falla si dist/ está vacío', async () => {
    const fs = new VirtualFS('memory')
    const manager = new DeployManager(fs)
    const result = await manager.deploy({
      provider: 'cloudflare-pages',
      token: 'fake',
      accountId: 'fake',
      projectName: 'test',
      distDir: '/dist',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('No se encontraron archivos')
  })
})
```
