import type { Nodebox } from '@codesandbox/nodebox'
import type { IVirtualFS } from '../types/fs.types'

export class NpmManager {
  constructor(
    private readonly nodebox: Nodebox,
    private readonly virtualFs?: IVirtualFS,
  ) {}

  async installAll(): Promise<void> {
    const shell = this.nodebox.shell.create()
    await shell.runCommand('npm', ['install'])
    await this.waitForExit(shell)
  }

  async addPackage(name: string, dev = false): Promise<void> {
    const shell = this.nodebox.shell.create()
    const args = ['install', name]
    if (dev) args.push('--save-dev')
    await shell.runCommand('npm', args)
    await this.waitForExit(shell)
    await this.syncPackageJson()
  }

  async removePackage(name: string): Promise<void> {
    const shell = this.nodebox.shell.create()
    await shell.runCommand('npm', ['uninstall', name])
    await this.waitForExit(shell)
    await this.syncPackageJson()
  }

  private async syncPackageJson(): Promise<void> {
    if (!this.virtualFs) return
    try {
      const content = await this.nodebox.fs.readFile('package.json', 'utf8')
      await this.virtualFs.writeFile('/package.json', content)
    } catch {
      // package.json may not exist in all projects
    }
  }

  private waitForExit(shell: import('@codesandbox/nodebox').ShellProcess): Promise<void> {
    return new Promise((resolve, reject) => {
      shell.on('exit', (code) => {
        code === 0
          ? resolve()
          : reject(new Error(`npm command exited with code ${code}`))
      })
    })
  }
}
