import type { ShellProcess } from '@codesandbox/nodebox'
import type { TerminalAdapter } from '../types/node.types'

export class TerminalBridge {
  private shell: ShellProcess | null = null
  private disposables: Array<() => void> = []

  connect(shell: ShellProcess, terminal: TerminalAdapter): void {
    this.shell = shell

    shell.stdout.on('data', (data) => terminal.write(data))
    shell.stderr.on('data', (data) => terminal.write(data))

    const off = terminal.onData.bind(terminal)
    off((data: string) => {
      shell.stdin.write(data)
    })

    this.disposables.push(() => {
      // strict-event-emitter has no removeListener exposed in ShellProcess
      // disconnect is handled by killing the shell
    })
  }

  async disconnect(): Promise<void> {
    for (const d of this.disposables) d()
    this.disposables = []

    if (this.shell) {
      await this.shell.kill()
      this.shell = null
    }
  }
}
