import type { Extension } from '@codemirror/state'
import type { VertexPlugin, VertexPluginContext, VertexPluginFactory, EditorContribution } from './types'

interface ActivePlugin {
  plugin: VertexPlugin
  disposables: (() => void)[]
}

/**
 * Plugin registry for Vertex IDE.
 *
 * Manages plugin lifecycle and aggregates editor contributions.
 */
export class PluginRegistry {
  private readonly plugins = new Map<string, ActivePlugin>()
  private readonly contextBase: Omit<VertexPluginContext, 'register'>

  constructor(context: Omit<VertexPluginContext, 'register'> = { log: console.log, warn: console.warn }) {
    this.contextBase = context
  }

  /**
   * Register and activate a plugin.
   */
  async register(factory: VertexPluginFactory): Promise<void> {
    const plugin = await factory()

    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin "${plugin.id}" is already registered`)
    }

    const disposables: (() => void)[] = []
    const context: VertexPluginContext = {
      ...this.contextBase,
      register: (disposable) => disposables.push(disposable),
    }

    await plugin.activate(context)
    this.plugins.set(plugin.id, { plugin, disposables })
  }

  /**
   * Unregister and deactivate a plugin by id.
   */
  async unregister(id: string): Promise<void> {
    const active = this.plugins.get(id)
    if (!active) return

    if (active.plugin.deactivate) {
      await active.plugin.deactivate()
    }

    for (const disposable of active.disposables) {
      try {
        disposable()
      } catch (err) {
        this.contextBase.warn(`Plugin "${id}" disposable threw during unregister`, err)
      }
    }

    this.plugins.delete(id)
  }

  /**
   * Returns ids of all registered plugins.
   */
  list(): string[] {
    return Array.from(this.plugins.keys())
  }

  /**
   * Check if a plugin is registered.
   */
  has(id: string): boolean {
    return this.plugins.has(id)
  }

  /**
   * Unregister all plugins.
   */
  async dispose(): Promise<void> {
    await Promise.all(this.list().map((id) => this.unregister(id)))
  }

  /**
   * Aggregate all editor contributions from registered plugins.
   */
  editorContributions(): EditorContribution[] {
    const contributions: EditorContribution[] = []
    for (const { plugin } of this.plugins.values()) {
      if (plugin.editorContributions) {
        contributions.push(...plugin.editorContributions)
      }
    }
    return contributions
  }

  /**
   * Resolve all editor extensions from registered plugins.
   * Useful when initializing a CodeMirror editor.
   */
  async resolveEditorExtensions(): Promise<Extension[]> {
    const contributions = this.editorContributions()
    const extensions: Extension[] = []

    for (const contribution of contributions) {
      try {
        const result = await contribution.getExtensions()
        extensions.push(...result)
      } catch (err) {
        this.contextBase.warn(
          `Editor contribution "${contribution.id}" failed to load extensions`,
          err,
        )
      }
    }

    return extensions
  }
}
