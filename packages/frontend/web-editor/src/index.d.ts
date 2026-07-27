export type SupportedLanguage =
  | "javascript"
  | "js"
  | "typescript"
  | "ts"
  | "html"
  | "css"
  | "json";

export type EditorTheme = "light" | "dark";

export interface CursorPosition {
  line: number;
  column: number;
  index: number;
}

export type ValueChangeEvent = CustomEvent<string>;

export type CursorActivityEvent = CustomEvent<CursorPosition>;

/**
 * Full editable `<vertex-editor>` custom element.
 *
 * Usage:
 * ```html
 * <vertex-editor
 *   language="typescript"
 *   theme="dark"
 *   value="console.log('hello')"
 *   readonly="false"
 *   line-numbers="true"
 *   height="400px"
 *   font-size="14">
 * </vertex-editor>
 * ```
 */
export interface VertexEditorElement extends HTMLElement {
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
  enableSearch: boolean;
  enableAutocomplete: boolean;

  getValue(): string;
  setValue(value: string): void;
  insertText(text: string): void;
  focus(): void;

  addEventListener<K extends keyof VertexEditorElementEventMap>(
    type: K,
    listener: (
      this: VertexEditorElement,
      ev: VertexEditorElementEventMap[K],
    ) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;

  removeEventListener<K extends keyof VertexEditorElementEventMap>(
    type: K,
    listener: (
      this: VertexEditorElement,
      ev: VertexEditorElementEventMap[K],
    ) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
}

export interface VertexEditorElementEventMap extends HTMLElementEventMap {
  valueChange: ValueChangeEvent;
  cursorActivity: CursorActivityEvent;
  ready: CustomEvent<void>;
}

/**
 * Read-only `<vertex-editor-lite>` custom element.
 */
export interface VertexEditorLiteElement extends HTMLElement {
  value: string;
  language: SupportedLanguage;
  theme: EditorTheme;
  lineNumbers: boolean;
  height: string;
  fontSize: string;
  wordWrap: boolean;

  getValue(): string;
  setValue(value: string): void;
  focus(): void;

  addEventListener<K extends keyof VertexEditorLiteElementEventMap>(
    type: K,
    listener: (
      this: VertexEditorLiteElement,
      ev: VertexEditorLiteElementEventMap[K],
    ) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;

  removeEventListener<K extends keyof VertexEditorLiteElementEventMap>(
    type: K,
    listener: (
      this: VertexEditorLiteElement,
      ev: VertexEditorLiteElementEventMap[K],
    ) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
}

export interface VertexEditorLiteElementEventMap extends HTMLElementEventMap {
  ready: CustomEvent<void>;
}

declare global {
  interface HTMLElementTagNameMap {
    "vertex-editor": VertexEditorElement;
    "vertex-editor-lite": VertexEditorLiteElement;
  }
}

export function getLanguageSupport(lang: string): Promise<unknown>;
export function isLanguageSupported(lang: string): boolean;
export function getSupportedLanguages(): string[];
export function registerLanguage(
  name: string,
  loader: () => Promise<unknown>,
  aliases?: readonly string[],
): void;
