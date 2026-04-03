// Public API exports

// Re-export types
export type { EditorTheme, CursorPosition } from "./lib/web-editor.component";

export type { SupportedLanguage } from "./lib/language-support";

// Re-export functions
export {
  getLanguageSupport,
  isLanguageSupported,
  getSupportedLanguages,
} from "./lib/language-support";

// Component export for Angular users
export { WebEditorComponent } from "./lib/web-editor.component";
