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
import { AttributeObserver } from "./attribute-observer";
import { EditorConfigurator } from "./editor-config-lite";
import { SupportedLanguage, getLanguageSupport } from "./language-support";

export type EditorTheme = "light" | "dark";

export interface CursorPosition {
  line: number;
  column: number;
}

/**
 * Vertex Editor Lite - Read-only code display component
 *
 * Optimized for displaying code with syntax highlighting.
 * All editing features have been removed to reduce bundle size.
 *
 * @usageNotes
 * Use this component when you only need to display code, not edit it.
 * For a full editing experience, consider using the full version.
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

    /* Hide cursor in read-only mode */
    .cm-cursor {
      display: none !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebEditorComponent implements AfterViewInit, OnDestroy {
  editorContainer = viewChild<ElementRef<HTMLDivElement>>("editorContainer");

  private hostElement = inject(ElementRef).nativeElement as HTMLElement;

  // Inputs - simplified for display only
  readonly value = input<string>("");
  readonly language = input<SupportedLanguage>("typescript");
  readonly theme = input<EditorTheme>("dark");
  readonly lineNumbers = input<boolean>(true);
  readonly height = input<string>("100%");
  readonly fontSize = input<string>("14");
  readonly tabSize = input<number>(2);

  // Outputs
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
    // Update value when input changes
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
        // lineNumbers already imported statically
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
  }

  ngAfterViewInit(): void {
    const initialValue = this.getInitialValue();

    this.attributeObserver = new AttributeObserver(this.hostElement, {
      onValueChange: (value) => this.handleAttributeValueChange(value),
      onThemeChange: (theme) =>
        this.handleAttributeThemeChange(theme as EditorTheme),
    });
    this.attributeObserver.start();

    this.initializeEditor(initialValue);
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

    this.editorView = new EditorView({
      state: this.configurator.createState({
        value: initialValue,
        language: languageSupport,
        theme: this.getInitialTheme(),
        lineNumbers: this.lineNumbers(),
        tabSize: this.tabSize(),
        onChange: (value) => {
          // Read-only: changes only from external sources
          // This can be used to detect copy operations
        },
      }),
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
   * Focus the editor (for accessibility)
   */
  focus(): void {
    this.editorView?.focus();
  }
}

/**
 * FEATURES REMOVED in Lite version:
 *
 * 1. wordWrap input - Not essential for code display
 * 2. placeholder input - Code display always has content
 * 3. readonly input - Always read-only in lite version
 * 4. valueChange output - Use getValue() instead
 * 5. insertText() method - Not applicable for read-only
 *
 * TO RE-ENABLE EDITING FEATURES:
 * 1. Import from editor-config.ts instead of editor-config-lite.ts
 * 2. Add back: wordWrap, placeholder, readonly inputs
 * 3. Add back: valueChange output, insertText() method
 * 4. Remove EditorState.readOnly.of(true) from config
 */
