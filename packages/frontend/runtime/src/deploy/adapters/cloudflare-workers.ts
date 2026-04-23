import { BaseDeployAdapter, toUint8Array } from './base'
import type {
  DeployConfig,
  DeployFileMap,
  DeployProgressCallback,
  DeployResult,
} from '../../types/deploy.types'

const API_BASE = 'https://api.cloudflare.com/client/v4'
const WORKER_ENTRY_CANDIDATES = ['/worker.js', '/_worker.js', '/index.js', '/main.js']

interface CfEnvelope<T> {
  success: boolean
  errors: Array<{ code?: number; message?: string }>
  messages: unknown[]
  result: T
}

interface SubdomainResult {
  subdomain: string
}

interface WorkerUploadResult {
  id?: string
  etag?: string
}

export class CloudflareWorkersAdapter extends BaseDeployAdapter {
  async deploy(
    files: DeployFileMap,
    config: DeployConfig,
    onProgress?: DeployProgressCallback
  ): Promise<DeployResult> {
    const started = performance.now()
    const workerName = config.workerName
    if (!workerName) {
      return {
        success: false,
        error: 'workerName is required for cloudflare-workers provider',
        duration: performance.now() - started,
        filesUploaded: 0,
      }
    }

    try {
      this.report(onProgress, 'preparing', 10, 'Locating worker entry')
      const entry = this.findWorkerEntry(files)
      if (!entry) {
        throw new Error(
          `No worker entry found. Expected one of: ${WORKER_ENTRY_CANDIDATES.join(', ')}`
        )
      }

      this.report(onProgress, 'preparing', 25, `Using entry ${entry.path}`)

      this.report(onProgress, 'uploading', 40, 'Uploading worker module')
      const upload = await this.uploadModuleWorker(config, workerName, entry)

      this.report(onProgress, 'deploying', 80, 'Resolving workers.dev subdomain')
      const url = await this.resolveWorkerUrl(config, workerName)

      this.report(onProgress, 'done', 100, 'Worker deployed')
      return {
        success: true,
        url,
        deploymentId: upload.id ?? upload.etag,
        duration: performance.now() - started,
        filesUploaded: 1,
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration: performance.now() - started,
        filesUploaded: 0,
      }
    }
  }

  private findWorkerEntry(
    files: DeployFileMap
  ): { path: string; bytes: Uint8Array } | null {
    for (const candidate of WORKER_ENTRY_CANDIDATES) {
      const content = files[candidate]
      if (content !== undefined) {
        return { path: candidate, bytes: toUint8Array(content) }
      }
    }
    // Fallback: first .js/.mjs at the root
    const rootJs = Object.keys(files).find(
      (p) => !p.slice(1).includes('/') && (p.endsWith('.js') || p.endsWith('.mjs'))
    )
    if (rootJs) return { path: rootJs, bytes: toUint8Array(files[rootJs]) }
    return null
  }

  private async uploadModuleWorker(
    config: DeployConfig,
    name: string,
    entry: { path: string; bytes: Uint8Array }
  ): Promise<WorkerUploadResult> {
    const moduleFilename = entry.path.replace(/^\//, '')
    const metadata = {
      main_module: moduleFilename,
      compatibility_date: new Date().toISOString().slice(0, 10),
    }

    const form = new FormData()
    form.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    )
    form.append(
      moduleFilename,
      new Blob([entry.bytes as unknown as BlobPart], {
        type: 'application/javascript+module',
      }),
      moduleFilename
    )

    const res = await fetch(
      `${API_BASE}/accounts/${config.accountId}/workers/scripts/${encodeURIComponent(name)}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${config.token}` },
        body: form,
      }
    )
    if (!res.ok) {
      throw new Error(`Worker upload failed: ${await this.parseApiError(res)}`)
    }
    const body = (await res.json()) as CfEnvelope<WorkerUploadResult>
    return body.result ?? {}
  }

  private async resolveWorkerUrl(config: DeployConfig, name: string): Promise<string> {
    try {
      const res = await fetch(
        `${API_BASE}/accounts/${config.accountId}/workers/subdomain`,
        { headers: this.buildAuthHeaders(config.token) }
      )
      if (!res.ok) return ''
      const body = (await res.json()) as CfEnvelope<SubdomainResult>
      const sub = body.result?.subdomain
      if (!sub) return ''
      return `https://${name}.${sub}.workers.dev`
    } catch {
      return ''
    }
  }
}
