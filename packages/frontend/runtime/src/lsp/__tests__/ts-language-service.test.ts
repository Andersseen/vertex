import { describe, test, expect, beforeAll } from 'bun:test'
import { tsLanguageService } from '../ts-language-service'

describe('TsLanguageService', () => {
  beforeAll(() => {
    tsLanguageService.destroy()
  })

  test('loads TypeScript and reports diagnostics', async () => {
    await tsLanguageService.updateFile('/test.ts', `const x: number = 'string';`)
    const diagnostics = await tsLanguageService.getDiagnostics('/test.ts')

    expect(diagnostics.length).toBeGreaterThan(0)
    expect(diagnostics[0].category).toBe('error')
  })

  test('provides completions for object properties', async () => {
    await tsLanguageService.updateFile('/test.ts', `const obj = { name: 'Ada' };\nobj.`)
    const completions = await tsLanguageService.getCompletions('/test.ts', 38)

    const labels = completions.map((c) => c.label)
    expect(labels).toContain('name')
  })

  test('provides quick info on hover', async () => {
    await tsLanguageService.updateFile('/test.ts', `const value: string = 'hello';`)
    const info = await tsLanguageService.getQuickInfo('/test.ts', 7)

    expect(info).toBeTruthy()
    expect(info).toContain('string')
  })

  test('emits status changes', async () => {
    const statuses: string[] = []
    const unsubscribe = tsLanguageService.onStatusChange((status) => statuses.push(status))

    await tsLanguageService.updateFile('/status.ts', `const ok = true;`)
    unsubscribe()

    expect(statuses).toContain('ready')
  })
})
