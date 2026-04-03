// Public API exports

// Re-export types
export type {
  SupportedLanguage,
  EditorTheme,
  CursorPosition,
  ValueChangeEvent,
  CursorActivityEvent,
  WebEditorElement,
  WebEditorElementEventMap
} from './index';

// Re-export functions
export {
  getLanguageSupport,
  isLanguageSupported,
  getSupportedLanguages
} from './lib/language-support';

// Component export for Angular users
export { WebEditorComponent } from './lib/web-editor.component';
export { WebEditorModule } from './lib/web-editor.module';
