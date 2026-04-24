import {
  BaseDeployAdapter,
  mimeTypeFor,
  sha256Hex,
  toBase64,
  toUint8Array,
} from './base'
import type {
  DeployConfig,
  DeployFileMap,
  DeployProgressCallback,
  DeployResult,
} from '../../types/deploy.types'

const API_BASE = 'https://api.cloudflare.com/client/v4'
const UPLOAD_BATCH_SIZE = 50

interface CfEnvelope<T> {
  success: boolean
  errors: Array<{ code?: number; message?: string }>
  messages: unknown[]
  result: T
}

interface PagesProject {
  name: string
  subdomain?: string
  production_branch?: string
}

interface UploadToken {
  jwt: string
}

interface PagesDeployment {
  id: string
  url: string
  project_name: string
}

interface PreparedAsset {
  path: string
  hash: string
  bytes: Uint8Array
  contentType: string
}

export class CloudflarePagesAdapter extends BaseDeployAdapter {
  async deploy(
    files: DeployFileMap,
    config: DeployConfig,
    onProgress?: DeployProgressCallback
  ): Promise<DeployResult> {
    const started = performance.now()
    const projectName = config.projectName
    if (!projectName) {
      return {
        success: false,
        error: 'projectName is required for cloudflare-pages provider',
        duration: performance.now() - started,
        filesUploaded: 0,
      }
    }

    try {
      this.report(onProgress, 'preparing', 5, 'Hashing files')
      const assets = await this.prepareAssets(files)

      this.report(onProgress, 'preparing', 15, 'Ensuring project exists')
      await this.ensureProject(config, projectName)

      this.report(onProgress, 'preparing', 25, 'Requesting upload token')
      const token = await this.fetchUploadToken(config, projectName)

      this.report(onProgress, 'uploading', 30, 'Detecting missing files')
      const missing = await this.checkMissing(token.jwt, assets.map((a) => a.hash))
      const toUpload = assets.filter((a) => missing.has(a.hash))

      if (toUpload.length > 0) {
        await this.uploadAssets(token.jwt, toUpload, (sent, total) => {
          const pct = 30 + Math.floor((sent / total) * 50)
          this.report(onProgress, 'uploading', pct, `Uploaded ${sent}/${total} files`)
        })
      } else {
        this.report(onProgress, 'uploading', 80, 'All assets cached — skipping upload')
      }

      this.report(onProgress, 'deploying', 85, 'Creating deployment')
      const deployment = await this.createDeployment(config, projectName, assets)

      this.report(onProgress, 'done', 100, 'Deployment live')
      return {
        success: true,
        url: deployment.url,
        deploymentId: deployment.id,
        duration: performance.now() - started,
        filesUploaded: toUpload.length,
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

  private async prepareAssets(files: DeployFileMap): Promise<PreparedAsset[]> {
    const out: PreparedAsset[] = []
    for (const [path, content] of Object.entries(files)) {
      const bytes = toUint8Array(content)
      const hash = (await sha256Hex(bytes)).slice(0, 32)
      out.push({
        path,
        hash,
        bytes,
        contentType: mimeTypeFor(path),
      })
    }
    return out
  }

  private async ensureProject(config: DeployConfig, name: string): Promise<void> {
    const getRes = await fetch(
      `${API_BASE}/accounts/${config.accountId}/pages/projects/${encodeURIComponent(name)}`,
      { headers: this.buildAuthHeaders(config.token) }
    )
    if (getRes.ok) return
    if (getRes.status !== 404) {
      throw new Error(`Failed to query project: ${await this.parseApiError(getRes)}`)
    }

    const createRes = await fetch(
      `${API_BASE}/accounts/${config.accountId}/pages/projects`,
      {
        method: 'POST',
        headers: this.buildAuthHeaders(config.token),
        body: JSON.stringify({
          name,
          production_branch: config.branch ?? 'main',
        }),
      }
    )
    if (!createRes.ok) {
      throw new Error(`Failed to create project: ${await this.parseApiError(createRes)}`)
    }
  }

  private async fetchUploadToken(config: DeployConfig, name: string): Promise<UploadToken> {
    const res = await fetch(
      `${API_BASE}/accounts/${config.accountId}/pages/projects/${encodeURIComponent(name)}/upload-token`,
      { headers: this.buildAuthHeaders(config.token) }
    )
    if (!res.ok) {
      throw new Error(`Failed to get upload token: ${await this.parseApiError(res)}`)
    }
    const body = (await res.json()) as CfEnvelope<UploadToken>
    if (!body.success) throw new Error('Cloudflare did not return a valid upload token')
    return body.result
  }

  private async checkMissing(jwt: string, hashes: string[]): Promise<Set<string>> {
    if (hashes.length === 0) return new Set()
    const res = await fetch(`${API_BASE}/pages/assets/check-missing`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hashes }),
    })
    if (!res.ok) {
      throw new Error(`check-missing failed: ${await this.parseApiError(res)}`)
    }
    const body = (await res.json()) as CfEnvelope<string[]>
    return new Set(body.result ?? hashes)
  }

  private async uploadAssets(
    jwt: string,
    assets: PreparedAsset[],
    onBatch: (sent: number, total: number) => void
  ): Promise<void> {
    const total = assets.length
    let sent = 0
    for (let i = 0; i < assets.length; i += UPLOAD_BATCH_SIZE) {
      const batch = assets.slice(i, i + UPLOAD_BATCH_SIZE)
      const payload = batch.map((a) => ({
        key: a.hash,
        value: toBase64(a.bytes),
        metadata: { contentType: a.contentType },
        base64: true,
      }))
      const res = await fetch(`${API_BASE}/pages/assets/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(`Asset upload failed: ${await this.parseApiError(res)}`)
      }
      sent += batch.length
      onBatch(sent, total)
    }
  }

  private async createDeployment(
    config: DeployConfig,
    name: string,
    assets: PreparedAsset[]
  ): Promise<PagesDeployment> {
    const manifest: Record<string, string> = {}
    for (const asset of assets) manifest[asset.path] = asset.hash

    const form = new FormData()
    form.append('manifest', JSON.stringify(manifest))
    if (config.branch) form.append('branch', config.branch)

    const res = await fetch(
      `${API_BASE}/accounts/${config.accountId}/pages/projects/${encodeURIComponent(name)}/deployments`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.token}` },
        body: form,
      }
    )
    if (!res.ok) {
      throw new Error(`Deployment create failed: ${await this.parseApiError(res)}`)
    }
    const body = (await res.json()) as CfEnvelope<PagesDeployment>
    if (!body.success || !body.result) {
      throw new Error('Cloudflare returned an empty deployment result')
    }
    return body.result
  }

  // Exposed for tests — retrieves the Pages project, returns null on 404.
  async getProject(config: DeployConfig, name: string): Promise<PagesProject | null> {
    const res = await fetch(
      `${API_BASE}/accounts/${config.accountId}/pages/projects/${encodeURIComponent(name)}`,
      { headers: this.buildAuthHeaders(config.token) }
    )
    if (res.status === 404) return null
    if (!res.ok) throw new Error(await this.parseApiError(res))
    const body = (await res.json()) as CfEnvelope<PagesProject>
    return body.result
  }
}
