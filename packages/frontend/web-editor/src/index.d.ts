// Type definitions for @vertex/web-editor

export type SupportedLanguage =
  | 'javascript' | 'js'
  | 'typescript' | 'ts'
  | 'tsx'
  | 'jsx'
  | 'html'
  | 'angular'
  | 'astro'
  | 'css'
  | 'json'
  | 'markdown' | 'md';

export type EditorTheme = 'light' | 'dark';

export interface CursorPosition {
  line: number;
  column: number;
}

export interface ValueChangeEvent extends CustomEvent {
  detail: {
    value: string;
  };
}

export interface CursorActivityEvent extends CustomEvent {
  detail: CursorPosition;
}

/**
 * Web Editor HTML Element
 *
 * Usage:
 * ```html
 * <web-editor
 *   language="typescript"
 *   theme="dark"
 *   value="console.log('hello')"
 *   readonly="false"
 *   line-numbers="true"
 *   height="400px"
 *   font-size="14">
 * </web-editor>
 * ```
 */
declare global {
  interface HTMLElementTagNameMap {
    'web-editor': WebEditorElement;
  }
}

export interface WebEditorElement extends HTMLElement {
  // Properties
  value: string;
  language: SupportedLanguage;
  theme: EditorTheme;
  readonly: boolean;
  lineNumbers: boolean;
  height: string;
  fontSize: string;
  placeholder: string;
  tabSize: number;
  wordWrap: boolean;

  // Methods
  getValue(): string;
  setValue(value: string): void;
  insertText(text: string): void;
  focus(): void;
  format(): Promise<void>;

  // Events
  addEventListener<K extends keyof WebEditorElementEventMap>(
    type: K,
    listener: (this: WebEditorElement, ev: WebEditorElementEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions
  ): void;

  removeEventListener<K extends keyof WebEditorElementEventMap>(
    type: K,
    listener: (this: WebEditorElement, ev: WebEditorElementEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions
  ): void;
}

export interface WebEditorElementEventMap extends HTMLElementEventMap {
  'value-change': ValueChangeEvent;
  'cursor-activity': CursorActivityEvent;
  'ready': Event;
  'focus': FocusEvent;
  'blur': FocusEvent;
}

// Utility functions
export function getLanguageSupport(lang: string): Promise<unknown>;
export function isLanguageSupported(lang: string): boolean;
export function getSupportedLanguages(): string[];
