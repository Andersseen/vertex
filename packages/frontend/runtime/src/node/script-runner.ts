import type { Nodebox } from '@codesandbox/nodebox'
import type { ScriptRunOptions } from '../types/node.types'

export interface ScriptResult {
  exitCode: number
  logs: Array<{ line: string; type: 'stdout' | 'stderr' }>
  durationMs: number
}

export class ScriptRunner {
  constructor(private readonly nodebox: Nodebox) {}

  async run(options: ScriptRunOptions): Promise<ScriptResult> {
    const shell = this.nodebox.shell.create()
    const logs: ScriptResult['logs'] = []
    const start = Date.now()

    shell.stdout.on('data', (data) => {
      logs.push({ line: data, type: 'stdout' })
      options.onOutput?.(data, 'stdout')
    })

    shell.stderr.on('data', (data) => {
      logs.push({ line: data, type: 'stderr' })
      options.onOutput?.(data, 'stderr')
    })

    await shell.runCommand('npm', ['run', options.script, ...(options.args ?? [])])

    const exitCode = await new Promise<number>((resolve) => {
      shell.on('exit', (code) => {
        options.onExit?.(code)
        resolve(code)
      })
    })

    return { exitCode, logs, durationMs: Date.now() - start }
  }
}
