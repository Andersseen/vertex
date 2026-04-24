import type { WebContainer } from '@webcontainer/api'
import type { PackageManager } from './types'

async function exists(container: WebContainer, path: string): Promise<boolean> {
  try {
    await container.fs.readFile(path)
    return true
  } catch {
    return false
  }
}

export async function detectPackageManager(container: WebContainer): Promise<PackageManager> {
  if (await exists(container, 'pnpm-lock.yaml')) return 'pnpm'
  if ((await exists(container, 'bun.lockb')) || (await exists(container, 'bun.lock')))
    return 'bun'
  if (await exists(container, 'yarn.lock')) return 'yarn'
  if (await exists(container, 'package-lock.json')) return 'npm'
  return 'npm'
}
