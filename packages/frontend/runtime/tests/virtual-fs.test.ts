import { describe, test, expect, beforeEach } from 'bun:test'
import { VirtualFS } from '../src/fs/virtual-fs'
import { MemoryFS } from '../src/fs/memory-adapter'

describe('MemoryFS', () => {
  let fs: MemoryFS

  beforeEach(() => {
    fs = new MemoryFS()
  })

  test('write and read file', async () => {
    await fs.writeFile('/src/app.ts', 'export const x = 1')
    expect(await fs.readFile('/src/app.ts')).toBe('export const x = 1')
  })

  test('normalize path without leading slash', async () => {
    await fs.writeFile('src/app.ts', 'content')
    expect(await fs.readFile('/src/app.ts')).toBe('content')
  })

  test('readDir returns files and directories', async () => {
    await fs.writeFile('/src/app.ts', '')
    await fs.writeFile('/src/utils/helper.ts', '')
    const entries = await fs.readDir('/src')
    const names = entries.map(e => e.name)
    expect(names).toContain('app.ts')
    expect(names).toContain('utils')
    expect(entries.find(e => e.name === 'utils')?.type).toBe('directory')
    expect(entries.find(e => e.name === 'app.ts')?.type).toBe('file')
  })

  test('readDir at root', async () => {
    await fs.writeFile('/package.json', '{}')
    await fs.writeFile('/src/main.ts', '')
    const entries = await fs.readDir('/')
    const names = entries.map(e => e.name)
    expect(names).toContain('package.json')
    expect(names).toContain('src')
  })

  test('exists returns true for file', async () => {
    await fs.writeFile('/a.ts', '')
    expect(await fs.exists('/a.ts')).toBe(true)
  })

  test('exists returns true for implicit directory', async () => {
    await fs.writeFile('/src/app.ts', '')
    expect(await fs.exists('/src')).toBe(true)
  })

  test('exists returns false for unknown path', async () => {
    expect(await fs.exists('/nope.ts')).toBe(false)
  })

  test('delete file', async () => {
    await fs.writeFile('/a.ts', '')
    await fs.deleteFile('/a.ts')
    expect(await fs.exists('/a.ts')).toBe(false)
  })

  test('delete non-existent file throws', async () => {
    expect(fs.deleteFile('/nope.ts')).rejects.toThrow('File not found')
  })

  test('read non-existent file throws', async () => {
    expect(fs.readFile('/nope.ts')).rejects.toThrow('File not found')
  })

  test('watch notifies on write', async () => {
    const events: string[] = []
    fs.watch('/', (event, path) => events.push(`${event}:${path}`))
    await fs.writeFile('/x.ts', 'content')
    expect(events).toContain('change:/x.ts')
  })

  test('watch notifies on delete', async () => {
    const events: string[] = []
    await fs.writeFile('/x.ts', '')
    fs.watch('/', (event, path) => events.push(`${event}:${path}`))
    await fs.deleteFile('/x.ts')
    expect(events).toContain('delete:/x.ts')
  })

  test('unwatch stops notifications', async () => {
    const events: string[] = []
    const unwatch = fs.watch('/', (event, path) => events.push(`${event}:${path}`))
    unwatch()
    await fs.writeFile('/x.ts', 'content')
    expect(events).toHaveLength(0)
  })

  test('clear removes all files', async () => {
    await fs.writeFile('/a.ts', '')
    await fs.writeFile('/b.ts', '')
    await fs.clear()
    expect(await fs.exists('/a.ts')).toBe(false)
    expect(await fs.exists('/b.ts')).toBe(false)
  })

  test('write Uint8Array content', async () => {
    const bytes = new TextEncoder().encode('binary content')
    await fs.writeFile('/binary.bin', bytes)
    const result = await fs.readFile('/binary.bin')
    expect(result).toBe('binary content')
  })
})

describe('VirtualFS (memory mode)', () => {
  test('creates MemoryFS in memory mode', () => {
    const fs = new VirtualFS('memory')
    expect(fs.mode).toBe('memory')
  })

  test('rawFs throws in memory mode', () => {
    const fs = new VirtualFS('memory')
    expect(() => fs.rawFs).toThrow('rawFs is only available in opfs mode')
  })

  test('proxies all operations correctly', async () => {
    const fs = new VirtualFS('memory')
    await fs.writeFile('/test.ts', 'hello')
    expect(await fs.readFile('/test.ts')).toBe('hello')
    expect(await fs.exists('/test.ts')).toBe(true)
    const entries = await fs.readDir('/')
    expect(entries.map(e => e.name)).toContain('test.ts')
    await fs.deleteFile('/test.ts')
    expect(await fs.exists('/test.ts')).toBe(false)
  })
})
