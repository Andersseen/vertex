/**
 * Backwards-compatible entry point for the public editor wrapper.
 *
 * The CodeMirror configuration lives in @vertex/editor-core so the embedded,
 * web-workbench, and Tauri surfaces share behavior without sharing product
 * concerns such as filesystem, preview, or Git.
 */
export { EditorConfigurator } from '@vertex/editor-core';
export type {
  EditorConfiguration as EditorConfig,
  EditorTheme,
  CursorPosition,
} from '@vertex/editor-core';
export { Compartment, EditorState, type Extension } from '@codemirror/state';
export { EditorView } from '@codemirror/view';
