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
} from "@angular/core";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  bracketMatching,
  defaultHighlightStyle,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { lintKeymap } from "@codemirror/lint";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { Compartment, EditorState, Extension } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  EditorView,
  ViewUpdate,
  keymap as cmKeymap,
  placeholder as cmPlaceholder,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightSpecialChars,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import { SupportedLanguage, getLanguageSupport } from "./language-support";

export type EditorTheme = "light" | "dark";

export interface CursorPosition {
  line: number;
  column: number;
}

/**
 * WebEditorComponent - A standalone CodeMirror 6 editor as an Angular component
 *
 * Modern Angular v20+ approach:
 * - Standalone by default (no standalone: true needed)
 * - Uses input() and output() functions
 * - OnPush change detection
 */
@Component({
  selector: "web-editor-internal",
  template: `<div #editorContainer class="web-editor-container"></div>`,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .web-editor-container {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family:
        "JetBrains Mono", "Fira Code", "Source Code Pro", "Monaco", "Consolas",
        monospace;
      font-size: var(--web-editor-font-size, 14px);
      line-height: var(--web-editor-line-height, 1.5);
    }

    :host([theme="dark"]) .web-editor-container {
      background: #1e1e1e;
    }

    :host([theme="light"]) .web-editor-container {
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

  // Inputs using input() function (Angular v20+)
  readonly value = input<string>("");
  readonly language = input<SupportedLanguage>("typescript");
  readonly theme = input<EditorTheme>("dark");
  readonly readonly = input<boolean>(false);
  readonly lineNumbers = input<boolean>(true);
  readonly height = input<string>("300px");
  readonly fontSize = input<string>("14");
  readonly placeholder = input<string>("");
  readonly tabSize = input<number>(2);
  readonly wordWrap = input<boolean>(false);

  // Outputs using output() function
  readonly valueChange = output<string>();
  readonly focusEvent = output<void>();
  readonly blurEvent = output<void>();
  readonly ready = output<void>();
  readonly cursorActivity = output<CursorPosition>();

  private editorView: EditorView | null = null;
  private readonly languageCompartment = new Compartment();
  private readonly themeCompartment = new Compartment();
  private readonly readonlyCompartment = new Compartment();
  private readonly lineNumbersCompartment = new Compartment();
  private readonly wordWrapCompartment = new Compartment();

  constructor() {
    // Effects to handle input changes
    effect(() => {
      const newValue = this.value();
      if (this.editorView) {
        const currentValue = this.editorView.state.doc.toString();
        if (currentValue !== newValue) {
          this.editorView.dispatch({
            changes: { from: 0, to: currentValue.length, insert: newValue },
          });
        }
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
          effects: this.readonlyCompartment.reconfigure(
            EditorState.readOnly.of(readonly),
          ),
        });
      }
    });

    effect(() => {
      const showLineNumbers = this.lineNumbers();
      if (this.editorView) {
        this.editorView.dispatch({
          effects: this.lineNumbersCompartment.reconfigure(
            showLineNumbers ? lineNumbers() : [],
          ),
        });
      }
    });

    effect(() => {
      const wrap = this.wordWrap();
      if (this.editorView) {
        this.editorView.dispatch({
          effects: this.wordWrapCompartment.reconfigure(
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
          "--web-editor-font-size",
          `${fontSize}px`,
        );
      }
    });
  }

  ngAfterViewInit(): void {
    this.initializeEditor();
    this.ready.emit();
  }

  ngOnDestroy(): void {
    this.editorView?.destroy();
  }

  private async initializeEditor(): Promise<void> {
    const languageSupport = await getLanguageSupport(this.language());
    const placeholderText = this.placeholder();

    const extensions: Extension[] = [
      // Basic setup
      highlightSpecialChars(),
      history(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),

      // Keymaps
      cmKeymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap,
      ]),

      // Language
      this.languageCompartment.of(languageSupport || []),

      // Theme
      this.themeCompartment.of(this.getThemeExtension()),

      // Readonly
      this.readonlyCompartment.of(EditorState.readOnly.of(this.readonly())),

      // Line numbers
      this.lineNumbersCompartment.of(this.lineNumbers() ? lineNumbers() : []),

      // Word wrap
      this.wordWrapCompartment.of(
        this.wordWrap() ? EditorView.lineWrapping : [],
      ),

      // Tab size
      EditorState.tabSize.of(this.tabSize()),

      // Update listener
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          this.valueChange.emit(update.state.doc.toString());
        }

        // Cursor activity
        const { head } = update.state.selection.main;
        const line = update.state.doc.lineAt(head);
        this.cursorActivity.emit({
          line: line.number,
          column: head - line.from,
        });
      }),
    ];

    // Add placeholder if provided
    if (placeholderText) {
      extensions.push(cmPlaceholder(placeholderText));
    }

    this.editorView = new EditorView({
      state: EditorState.create({
        doc: this.value(),
        extensions,
      }),
      parent: this.editorContainer.nativeElement,
    });

    // Apply initial styles
    this.editorContainer.nativeElement.style.height = this.height();
    this.editorContainer.nativeElement.style.setProperty(
      "--web-editor-font-size",
      `${this.fontSize()}px`,
    );
  }

  private async updateLanguage(): Promise<void> {
    if (!this.editorView) return;
    const languageSupport = await getLanguageSupport(this.language());
    if (languageSupport) {
      this.editorView.dispatch({
        effects: this.languageCompartment.reconfigure(languageSupport),
      });
    }
  }

  private updateTheme(): void {
    if (!this.editorView) return;
    this.editorView.dispatch({
      effects: this.themeCompartment.reconfigure(this.getThemeExtension()),
    });
  }

  private getThemeExtension(): Extension {
    return this.theme() === "dark" ? oneDark : [];
  }

  // Public API methods
  getValue(): string {
    return this.editorView?.state.doc.toString() || "";
  }

  setValue(value: string): void {
    if (this.editorView) {
      const currentValue = this.editorView.state.doc.toString();
      this.editorView.dispatch({
        changes: { from: 0, to: currentValue.length, insert: value },
      });
    }
  }

  insertText(text: string): void {
    if (this.editorView) {
      const { from } = this.editorView.state.selection.main;
      this.editorView.dispatch({
        changes: { from, insert: text },
      });
    }
  }

  focus(): void {
    this.editorView?.focus();
  }

  async format(): Promise<void> {
    console.log("Format functionality - to be implemented");
  }
}
