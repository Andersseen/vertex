import type { Extension } from '@codemirror/state'
import type { IVirtualFS } from '../types/fs.types'

/**
 * Context passed to plugins during activation.
 * Provides access to Vertex IDE services and APIs.
 */
export interface VertexPluginContext {
  /** Virtual filesystem instance, if available. */
  fs?: IVirtualFS

  /** Emit a log message from the plugin. */
  log: (message: string, ...args: unknown[]) => void

  /** Emit a warning from the plugin. */
  warn: (message: string, ...args: unknown[]) => void

  /** Register a disposable resource to be cleaned up on deactivation. */
  register: (disposable: () => void) => void
}

/**
 * Contribution that a plugin can provide to extend the editor.
 */
export interface EditorContribution {
  /** Unique contribution id within the plugin. */
  id: string

  /**
   * Returns CodeMirror extensions to add to the editor.
   * Called lazily when an editor is created.
   */
  getExtensions(): Promise<Extension[]> | Extension[]
}

/**
 * A Vertex plugin.
 *
 * Plugins are plain objects/functions that extend IDE functionality.
 * They cannot depend on Angular internals and must be usable from
 * browser-only contexts (web component, runtime, etc.).
 */
export interface VertexPlugin {
  /** Unique plugin id. */
  id: string

  /** Human-readable name. */
  name: string

  /** Semver version. */
  version: string

  /** Optional description. */
  description?: string

  /**
   * Called once when the plugin is registered.
   * Use this to register commands, menus, filesystem watchers, etc.
   */
  activate(context: VertexPluginContext): Promise<void> | void

  /**
   * Called when the plugin is unregistered or the IDE shuts down.
   * Clean up timers, event listeners, and registered disposables here.
   */
  deactivate?(): Promise<void> | void

  /** Editor contributions provided by this plugin. */
  editorContributions?: EditorContribution[]
}

/**
 * A plugin constructor or factory function.
 */
export type VertexPluginFactory = () => VertexPlugin | Promise<VertexPlugin>
