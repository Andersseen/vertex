import { describe, test, expect, beforeEach } from 'bun:test'
import { Extension } from '@codemirror/state'
import { PluginRegistry } from '../registry'
import type { VertexPlugin } from '../types'

describe('PluginRegistry', () => {
  let registry: PluginRegistry

  beforeEach(() => {
    registry = new PluginRegistry({ log: () => {}, warn: () => {} })
  })

  test('registers and activates a plugin', async () => {
    let activated = false
    const plugin: VertexPlugin = {
      id: 'test.plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      activate: () => {
        activated = true
      },
    }

    await registry.register(() => plugin)
    expect(activated).toBe(true)
    expect(registry.has('test.plugin')).toBe(true)
    expect(registry.list()).toEqual(['test.plugin'])
  })

  test('throws when registering duplicate plugin', async () => {
    const plugin: VertexPlugin = {
      id: 'dup.plugin',
      name: 'Dup',
      version: '1.0.0',
      activate: () => {},
    }

    await registry.register(() => plugin)
    await expect(registry.register(() => plugin)).rejects.toThrow(
      'Plugin "dup.plugin" is already registered',
    )
  })

  test('unregisters plugin and runs disposables', async () => {
    let disposed = false
    const plugin: VertexPlugin = {
      id: 'dispose.plugin',
      name: 'Dispose Plugin',
      version: '1.0.0',
      activate: (ctx) => {
        ctx.register(() => {
          disposed = true
        })
      },
    }

    await registry.register(() => plugin)
    await registry.unregister('dispose.plugin')
    expect(disposed).toBe(true)
    expect(registry.has('dispose.plugin')).toBe(false)
  })

  test('resolves editor extensions from contributions', async () => {
    const ext: Extension = []
    const plugin: VertexPlugin = {
      id: 'editor.plugin',
      name: 'Editor Plugin',
      version: '1.0.0',
      activate: () => {},
      editorContributions: [
        {
          id: 'my-contribution',
          getExtensions: () => [ext],
        },
      ],
    }

    await registry.register(() => plugin)
    const extensions = await registry.resolveEditorExtensions()
    expect(extensions).toHaveLength(1)
  })

  test('disposes all plugins', async () => {
    const plugin: VertexPlugin = {
      id: 'dispose-all.plugin',
      name: 'Dispose All',
      version: '1.0.0',
      activate: () => {},
    }

    await registry.register(() => plugin)
    await registry.dispose()
    expect(registry.list()).toHaveLength(0)
  })
})
