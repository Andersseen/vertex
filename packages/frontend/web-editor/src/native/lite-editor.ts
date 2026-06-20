import { Compartment, EditorState, Extension } from '@codemirror/state'
import {
  defaultHighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import {
  drawSelection,
  EditorView,
  highlightSpecialChars,
  lineNumbers,
} from '@codemirror/view'
import type { SupportedLanguage } from '../lib/language-support-lite'
import { getLanguageSupport } from '../lib/language-support-lite'

export type EditorTheme = 'dark' | 'light';

const OBSERVED_ATTRIBUTES = [
  'value',
  'language',
  'theme',
  'line-numbers',
  'height',
  'font-size',
] as const;

/**
 * Native (Angular-free) lightweight read-only code display web component.
 *
 * Custom element: <vertex-editor-lite>
 */
export class VertexEditorLiteElement extends HTMLElement {
  static observedAttributes = OBSERVED_ATTRIBUTES;

  private editorView: EditorView | null = null;
  private languageCompartment = new Compartment();
  private themeCompartment = new Compartment();
  private lineNumbersCompartment = new Compartment();

  private _ready = false;
  private _pendingValue: string | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.renderContainer();
    void this.initializeEditor();
  }

  disconnectedCallback(): void {
    this.editorView?.destroy();
    this.editorView = null;
  }

  attributeChangedCallback(
    name: (typeof OBSERVED_ATTRIBUTES)[number],
    _oldValue: string | null,
    newValue: string | null,
  ): void {
    if (!this._ready) return;

    switch (name) {
      case 'value':
        this.setValue(newValue ?? '');
        break;
      case 'language':
        void this.updateLanguage();
        break;
      case 'theme':
        this.updateTheme();
        break;
      case 'line-numbers':
        this.updateLineNumbers();
        break;
      case 'height':
        this.updateHeight();
        break;
      case 'font-size':
        this.updateFontSize();
        break;
    }
  }

  private renderContainer(): void {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .container {
        width: 100%;
        height: 100%;
        overflow: auto;
        font-family: "JetBrains Mono", "Fira Code", "Source Code Pro", "Monaco", "Consolas", monospace;
        font-size: var(--vertex-editor-font-size, 14px);
        line-height: var(--vertex-editor-line-height, 1.5);
      }
      .cm-editor {
        height: 100% !important;
      }
      .cm-scroller {
        font-family: inherit !important;
      }
      .cm-gutters {
        font-family: inherit !important;
        font-size: 0.9em;
      }
      .cm-cursor {
        display: none !important;
      }
    `;

    const container = document.createElement('div');
    container.className = 'container';
    container.id = 'editor-container';

    this.shadowRoot?.appendChild(style);
    this.shadowRoot?.appendChild(container);
  }

  private async initializeEditor(): Promise<void> {
    const container = this.shadowRoot?.getElementById('editor-container');
    if (!container) return;

    const value = this.getAttribute('value') ?? '';
    const language = (this.getAttribute('language') ?? 'javascript') as SupportedLanguage;
    const theme = (this.getAttribute('theme') ?? 'dark') as EditorTheme;
    const showLineNumbers = this.getAttribute('line-numbers') !== 'false';

    const langSupport = await getLanguageSupport(language);

    const state = EditorState.create({
      doc: value,
      extensions: [
        highlightSpecialChars(),
        drawSelection(),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        this.themeCompartment.of(this.getThemeExtension(theme)),
        this.languageCompartment.of(langSupport ? [langSupport] : []),
        this.lineNumbersCompartment.of(showLineNumbers ? lineNumbers() : []),
      ],
    });

    this.editorView = new EditorView({
      state,
      parent: container,
    });

    this.updateHeight();
    this.updateFontSize();

    if (this._pendingValue !== null) {
      this.setValue(this._pendingValue);
      this._pendingValue = null;
    }

    this._ready = true;
    this.dispatchEvent(new CustomEvent('ready', { bubbles: true, composed: true }));
  }

  private getThemeExtension(theme: EditorTheme): Extension {
    return theme === 'dark' ? oneDark : [];
  }

  private async updateLanguage(): Promise<void> {
    if (!this.editorView) return;
    const language = (this.getAttribute('language') ?? 'javascript') as SupportedLanguage;
    const support = await getLanguageSupport(language);
    this.editorView.dispatch({
      effects: this.languageCompartment.reconfigure(support ? [support] : []),
    });
  }

  private updateTheme(): void {
    if (!this.editorView) return;
    const theme = (this.getAttribute('theme') ?? 'dark') as EditorTheme;
    this.editorView.dispatch({
      effects: this.themeCompartment.reconfigure(this.getThemeExtension(theme)),
    });
  }

  private updateLineNumbers(): void {
    if (!this.editorView) return;
    const show = this.getAttribute('line-numbers') !== 'false';
    this.editorView.dispatch({
      effects: this.lineNumbersCompartment.reconfigure(show ? lineNumbers() : []),
    });
  }

  private updateHeight(): void {
    const container = this.shadowRoot?.getElementById('editor-container');
    if (container) {
      container.style.height = this.getAttribute('height') ?? '100%';
    }
  }

  private updateFontSize(): void {
    const container = this.shadowRoot?.getElementById('editor-container');
    if (container) {
      container.style.setProperty(
        '--vertex-editor-font-size',
        `${this.getAttribute('font-size') ?? '14'}px`,
      );
    }
  }

  // Public API
  getValue(): string {
    return this.editorView?.state.doc.toString() ?? '';
  }

  setValue(value: string): void {
    if (!this.editorView) {
      this._pendingValue = value;
      return;
    }
    const current = this.editorView.state.doc.toString();
    if (value !== current) {
      this.editorView.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }

  focus(): void {
    this.editorView?.focus();
  }
}
