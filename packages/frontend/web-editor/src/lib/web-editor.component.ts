import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  input,
  output,
  inject,
} from "@angular/core";
import { EditorView, lineNumbers } from "@codemirror/view";
import { SupportedLanguage, getLanguageSupport } from "./language-support";
import { EditorConfigurator } from "./editor-config";
import { AttributeObserver } from "./attribute-observer";

export type EditorTheme = "light" | "dark";

export interface CursorPosition {
  line: number;
  column: number;
}

@Component({
  selector: "vertex-editor-internal",
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
  @ViewChild("editorContainer", { static: true })
  editorContainer!: ElementRef<HTMLDivElement>;

  private hostElement = inject(ElementRef).nativeElement as HTMLElement;

  // Inputs
  readonly value = input<string>("");
  readonly language = input<SupportedLanguage>("typescript");
  readonly theme = input<EditorTheme>("dark");
  readonly readonly = input<boolean>(false);
  readonly lineNumbers = input<boolean>(true);
  readonly height = input<string>("100%");
  readonly fontSize = input<string>("14");
  readonly placeholder = input<string>("");
  readonly tabSize = input<number>(2);
  readonly wordWrap = input<boolean>(false);

  // Outputs
  readonly valueChange = output<string>();
  readonly cursorActivity = output<CursorPosition>();
  readonly ready = output<void>();

  // Private state
  private editorView: EditorView | null = null;
  private configurator = new EditorConfigurator();
  private attributeObserver: AttributeObserver | null = null;
  private _isInitialized = false;
  private pendingValue: string | null = null;

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  constructor() {
    this.setupEffects();
  }

  private setupEffects(): void {
    effect(() => {
      const newValue = this.value();
      if (this.editorView && this._isInitialized) {
        this.updateEditorValue(newValue);
      }
    });

    effect(() => {
      this.language();
      this.updateLanguage();
    });

    effect(() => {
      this.theme();
      this.updateTheme();
    });

    effect(() => {
      const readonly = this.readonly();
      if (this.editorView) {
        this.editorView.dispatch({
          effects: this.configurator.readonlyCompartment.reconfigure(
            EditorView.editable.of(!readonly),
          ),
        });
      }
    });

    effect(() => {
      const showLineNumbers = this.lineNumbers();
      if (this.editorView) {
        this.editorView.dispatch({
          effects: this.configurator.lineNumbersCompartment.reconfigure(
            showLineNumbers ? this.getLineNumbersExtension() : [],
          ),
        });
      }
    });

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

    effect(() => {
      const height = this.height();
      if (this.editorContainer?.nativeElement) {
        this.editorContainer.nativeElement.style.height = height;
      }
    });

    effect(() => {
      const fontSize = this.fontSize();
      if (this.editorContainer?.nativeElement) {
        this.editorContainer.nativeElement.style.setProperty(
          "--vertex-editor-font-size",
          `${fontSize}px`,
        );
      }
    });
  }

  private getLineNumbersExtension() {
    return lineNumbers();
  }

  ngAfterViewInit(): void {
    const initialValue = this.getInitialValue();

    this.attributeObserver = new AttributeObserver(this.hostElement, {
      onValueChange: (value) => this.handleAttributeValueChange(value),
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

  private async initializeEditor(initialValue: string): Promise<void> {
    const languageSupport = await getLanguageSupport(this.language());

    this.editorView = new EditorView({
      state: this.configurator.createState({
        value: initialValue,
        language: languageSupport,
        theme: this.theme(),
        readonly: this.readonly(),
        lineNumbers: this.lineNumbers(),
        wordWrap: this.wordWrap(),
        tabSize: this.tabSize(),
        placeholder: this.placeholder(),
        onChange: (value) => this.valueChange.emit(value),
        onCursorActivity: (pos) => this.cursorActivity.emit(pos),
      }),
      parent: this.editorContainer.nativeElement,
    });

    this.editorContainer.nativeElement.style.height = this.height();
    this.editorContainer.nativeElement.style.setProperty(
      "--vertex-editor-font-size",
      `${this.fontSize()}px`,
    );

    this._isInitialized = true;
    this.attributeObserver?.stopPolling();

    // Check if value changed during initialization
    const currentAttrValue = this.hostElement.getAttribute("value");
    if (currentAttrValue && currentAttrValue !== initialValue) {
      this.updateEditorValue(currentAttrValue);
    }

    // Process pending value
    if (this.pendingValue !== null) {
      this.updateEditorValue(this.pendingValue);
      this.pendingValue = null;
    }

    this.ready.emit();
  }

  private handleAttributeValueChange(newValue: string): void {
    if (this.editorView && this._isInitialized) {
      this.updateEditorValue(newValue);
    } else {
      this.pendingValue = newValue;
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

  private updateTheme(): void {
    if (!this.editorView) return;

    this.editorView.dispatch({
      effects: this.configurator.themeCompartment.reconfigure(
        this.configurator.getThemeExtension(this.theme()),
      ),
    });
  }

  // Public API methods
  getValue(): string {
    return this.editorView?.state.doc.toString() || "";
  }

  setValue(value: string): void {
    if (this.editorView && this._isInitialized) {
      this.updateEditorValue(value);
    } else {
      this.pendingValue = value;
    }
  }

  insertText(text: string): void {
    if (!this.editorView) return;

    const { from } = this.editorView.state.selection.main;
    this.editorView.dispatch({
      changes: { from, insert: text },
    });
  }

  focus(): void {
    this.editorView?.focus();
  }
}
