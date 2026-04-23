export type DeployProvider = 'cloudflare-pages' | 'cloudflare-workers'

export interface DeployConfig {
  provider: DeployProvider
  token: string
  accountId: string
  projectName?: string
  branch?: string
  workerName?: string
  distDir: string
}

export interface DeployResult {
  success: boolean
  url?: string
  deploymentId?: string
  error?: string
  duration: number
  filesUploaded: number
}

export type DeployPhase = 'preparing' | 'uploading' | 'deploying' | 'done'

export type DeployProgressCallback = (
  phase: DeployPhase,
  percent: number,
  message?: string
) => void

export interface DeployFileMap {
  [path: string]: Uint8Array | string
}

export interface IDeployAdapter {
  deploy(
    files: DeployFileMap,
    config: DeployConfig,
    onProgress?: DeployProgressCallback
  ): Promise<DeployResult>
}
