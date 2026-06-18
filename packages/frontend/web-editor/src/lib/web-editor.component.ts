import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  output,
  viewChild,
} from "@angular/core";
import { EditorView, lineNumbers } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { AttributeObserver } from "./attribute-observer";
import { EditorConfigurator } from "./editor-config";
import { SupportedLanguage, getLanguageSupport } from "./language-support";

export type EditorTheme = "light" | "dark";

export interface CursorPosition {
  line: number;
  column: number;
}

/**
 * Vertex Editor - Full code editing component
 *
 * Supports syntax highlighting, editing, search, history, autocomplete,
 * line numbers, word wrap, themes, and programmatic value updates.
 *
 * @usageNotes
 * Use this component when you need a complete code editing experience.
 * For read-only code display, use WebEditorLiteComponent instead.
 */
@Component({
  selector: "v-editor-internal",
  template: `<div #editorContainer class="vertex-editor-container"></div>`,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .vertex-editor-container {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family:
        "JetBrains Mono", "Fira Code", "Source Code Pro", "Monaco", "Consolas",
        monospace;
      font-size: var(--vertex-editor-font-size, 14px);
      line-height: var(--vertex-editor-line-height, 1.5);
    }

    :host([theme="dark"]) .vertex-editor-container {
      background: #1e1e1e;
    }

    :host([theme="light"]) .vertex-editor-container {
      background: #ffffff;
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebEditorComponent implements AfterViewInit, OnDestroy {
  editorContainer = viewChild<ElementRef<HTMLDivElement>>("editorContainer");

  private hostElement = inject(ElementRef).nativeElement as HTMLElement;

  // Inputs
  readonly value = input<string>("");
  readonly language = input<SupportedLanguage>("typescript");
  readonly theme = input<EditorTheme>("dark");
  readonly lineNumbers = input<boolean>(true);
  readonly height = input<string>("100%");
  readonly fontSize = input<string>("14");
  readonly tabSize = input<number>(2);
  readonly readonly = input<boolean>(false);
  readonly wordWrap = input<boolean>(false);
  readonly placeholder = input<string>("");
  readonly enableSearch = input<boolean>(true);
  readonly enableAutocomplete = input<boolean>(true);

  // Outputs
  readonly valueChange = output<string>();
  readonly cursorActivity = output<CursorPosition>();
  readonly ready = output<void>();

  // Private state
  private editorView: EditorView | null = null;
  private configurator = new EditorConfigurator();
  private attributeObserver: AttributeObserver | null = null;
  private _isInitialized = false;

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  constructor() {
    this.setupEffects();
  }

  private setupEffects(): void {
    // Update value when input changes (external updates only)
    effect(() => {
      const newValue = this.value();
      if (this.editorView && this._isInitialized) {
        this.updateEditorValue(newValue);
      }
    });

    // Update language when input changes
    effect(() => {
      this.language();
      this.updateLanguage();
    });

    // Update theme when input changes
    effect(() => {
      this.theme();
      this.updateTheme();
    });

    // Update line numbers visibility
    effect(() => {
      const showLineNumbers = this.lineNumbers();
      if (this.editorView) {
        this.editorView.dispatch({
          effects: this.configurator.lineNumbersCompartment.reconfigure(
            showLineNumbers ? lineNumbers() : [],
          ),
        });
      }
    });

    // Update height
    effect(() => {
      const height = this.height();
      const container = this.editorContainer();
      if (container?.nativeElement) {
        container.nativeElement.style.height = height;
      }
    });

    // Update font size
    effect(() => {
      const fontSize = this.fontSize();
      const container = this.editorContainer();
      if (container?.nativeElement) {
        container.nativeElement.style.setProperty(
          "--vertex-editor-font-size",
          `${fontSize}px`,
        );
      }
    });

    // Update readonly state
    effect(() => {
      const isReadonly = this.readonly();
      if (this.editorView) {
        this.editorView.dispatch({
          effects: [
            this.configurator.readonlyCompartment.reconfigure(
              EditorState.readOnly.of(isReadonly),
            ),
            this.configurator.editableCompartment.reconfigure(
              EditorView.editable.of(!isReadonly),
            ),
          ],
        });
      }
    });

    // Update word wrap
    effect(() => {
      const wrap = this.wordWrap();
      if (this.editorView) {
        this.editorView.dispatch({
          effects: this.configurator.wordWrapCompartment.reconfigure(
            wrap ? EditorView.lineWrapping : [],
          ),
        });
      }
    });
  }

  ngAfterViewInit(): void {
    const initialValue = this.getInitialValue();

    this.attributeObserver = new AttributeObserver(this.hostElement, {
      onValueChange: (value) => this.handleAttributeValueChange(value),
      onThemeChange: (theme) =>
        this.handleAttributeThemeChange(theme as EditorTheme),
    });
    this.attributeObserver.start();

    void this.initializeEditor(initialValue);
  }

  ngOnDestroy(): void {
    this.attributeObserver?.stop();
    this.editorView?.destroy();
  }

  private getInitialValue(): string {
    const attrValue = this.hostElement.getAttribute("value");
    if (attrValue !== null && attrValue !== "") {
      return attrValue;
    }
    return this.value() || "";
  }

  private getInitialTheme(): EditorTheme {
    const attrTheme = this.hostElement.getAttribute("theme");
    if (attrTheme === "light" || attrTheme === "dark") {
      return attrTheme;
    }
    return this.theme();
  }

  private async initializeEditor(initialValue: string): Promise<void> {
    const languageSupport = await getLanguageSupport(this.language());

    const state = await this.configurator.createState({
      value: initialValue,
      language: languageSupport,
      theme: this.getInitialTheme(),
      readonly: this.readonly(),
      lineNumbers: this.lineNumbers(),
      wordWrap: this.wordWrap(),
      tabSize: this.tabSize(),
      placeholder: this.placeholder() || undefined,
      enableSearch: this.enableSearch(),
      enableAutocomplete: this.enableAutocomplete(),
      onChange: (value) => this.valueChange.emit(value),
      onCursorActivity: (position) => this.cursorActivity.emit(position),
    });

    this.editorView = new EditorView({
      state,
      parent: this.editorContainer()?.nativeElement,
    });

    const container = this.editorContainer();
    if (container?.nativeElement.style) {
      container.nativeElement.style.height = this.height();
      container.nativeElement.style.setProperty(
        "--vertex-editor-font-size",
        `${this.fontSize()}px`,
      );
    }

    this._isInitialized = true;
    this.attributeObserver?.stopPolling();

    // Check if value changed during initialization
    const currentAttrValue = this.hostElement.getAttribute("value");
    if (currentAttrValue && currentAttrValue !== initialValue) {
      this.updateEditorValue(currentAttrValue);
    }

    this.ready.emit();
  }

  private handleAttributeValueChange(newValue: string): void {
    if (this.editorView && this._isInitialized) {
      this.updateEditorValue(newValue);
    }
  }

  private handleAttributeThemeChange(newTheme: EditorTheme): void {
    if (this.editorView && this._isInitialized) {
      this.updateTheme(newTheme);
    }
  }

  private updateEditorValue(value: string): void {
    if (!this.editorView) return;

    const currentValue = this.editorView.state.doc.toString();
    if (value !== currentValue) {
      this.editorView.dispatch({
        changes: { from: 0, to: currentValue.length, insert: value },
      });
    }
  }

  private async updateLanguage(): Promise<void> {
    if (!this.editorView) return;

    const languageSupport = await getLanguageSupport(this.language());
    if (languageSupport) {
      this.editorView.dispatch({
        effects:
          this.configurator.languageCompartment.reconfigure(languageSupport),
      });
    }
  }

  private updateTheme(theme?: EditorTheme): void {
    if (!this.editorView) return;

    const themeValue = theme || this.theme();
    this.editorView.dispatch({
      effects: this.configurator.themeCompartment.reconfigure(
        this.configurator.getThemeExtension(themeValue),
      ),
    });
  }

  // Public API methods

  /**
   * Get the current value of the editor
   */
  getValue(): string {
    return this.editorView?.state.doc.toString() || "";
  }

  /**
   * Set the value of the editor
   */
  setValue(value: string): void {
    if (this.editorView && this._isInitialized) {
      this.updateEditorValue(value);
    }
  }

  /**
   * Insert text at the current cursor position
   */
  insertText(text: string): void {
    if (!this.editorView || this.readonly()) return;

    const { from, to } = this.editorView.state.selection.main;
    this.editorView.dispatch({
      changes: { from, to, insert: text },
    });
  }

  /**
   * Focus the editor (for accessibility)
   */
  focus(): void {
    this.editorView?.focus();
  }
}
