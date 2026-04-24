import { collectDistFiles } from './adapters/base'
import { CloudflarePagesAdapter } from './adapters/cloudflare-pages'
import { CloudflareWorkersAdapter } from './adapters/cloudflare-workers'
import type { IVirtualFS } from '../types/fs.types'
import type {
  DeployConfig,
  DeployProgressCallback,
  DeployResult,
  IDeployAdapter,
} from '../types/deploy.types'

export class DeployManager {
  private readonly adapters: Record<DeployConfig['provider'], IDeployAdapter>

  constructor(
    private readonly fs: IVirtualFS,
    customAdapters?: Partial<Record<DeployConfig['provider'], IDeployAdapter>>
  ) {
    this.adapters = {
      'cloudflare-pages': customAdapters?.['cloudflare-pages'] ?? new CloudflarePagesAdapter(),
      'cloudflare-workers':
        customAdapters?.['cloudflare-workers'] ?? new CloudflareWorkersAdapter(),
    }
  }

  async deploy(
    config: DeployConfig,
    onProgress?: DeployProgressCallback
  ): Promise<DeployResult> {
    const started = performance.now()

    if (!config.token) {
      return this.fail('Missing Cloudflare API token', started)
    }
    if (!config.accountId) {
      return this.fail('Missing Cloudflare accountId', started)
    }
    if (!config.distDir) {
      return this.fail('Missing distDir in deploy config', started)
    }

    const adapter = this.adapters[config.provider]
    if (!adapter) {
      return this.fail(`Unknown deploy provider: ${config.provider}`, started)
    }

    if (onProgress) onProgress('preparing', 0, `Reading ${config.distDir}`)
    const files = await collectDistFiles(this.fs, config.distDir)
    const fileCount = Object.keys(files).length
    if (fileCount === 0) {
      return this.fail(`No files found under ${config.distDir} — build first?`, started)
    }

    return adapter.deploy(files, config, onProgress)
  }

  private fail(message: string, started: number): DeployResult {
    return {
      success: false,
      error: message,
      duration: performance.now() - started,
      filesUploaded: 0,
    }
  }
}
