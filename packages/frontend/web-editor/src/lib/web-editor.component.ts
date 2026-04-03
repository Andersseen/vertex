import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  NgZone,
} from "@angular/core";
import { EditorView, keymap, ViewUpdate } from "@codemirror/view";
import { EditorState, Compartment, Extension } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
  keymap as cmKeymap,
} from "@codemirror/view";
import {
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldKeymap,
} from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import {
  getLanguageSupport,
  SupportedLanguage,
  isLanguageSupported,
  getSupportedLanguages,
} from "./language-support";

// Re-export types
export { SupportedLanguage } from "./language-support";

export type EditorTheme = "light" | "dark";

/**
 * WebEditorComponent - A standalone CodeMirror 6 editor as an Angular component
 *
 * This component wraps CodeMirror 6 and provides a clean API for embedding
 * in any web application. It can be used directly or converted to a Web Component.
 */
@Component({
  selector: "web-editor-internal",
  template: `<div #editorContainer class="web-editor-container"></div>`,
  styles: [
    `
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
          "JetBrains Mono", "Fira Code", "Source Code Pro", "Monaco",
          "Consolas", monospace;
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

      /* Custom scrollbar styles */
      .cm-scroller::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }

      .cm-scroller::-webkit-scrollbar-track {
        background: transparent;
      }

      .cm-scroller::-webkit-scrollbar-thumb {
        background: var(--scrollbar-color, rgba(128, 128, 128, 0.4));
        border-radius: 5px;
      }

      .cm-scroller::-webkit-scrollbar-thumb:hover {
        background: var(--scrollbar-hover-color, rgba(128, 128, 128, 0.6));
      }
    `,
  ],
  standalone: true,
})
export class WebEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild("editorContainer", { static: true })
  editorContainer!: ElementRef<HTMLDivElement>;

  // Inputs
  @Input() value = "";
  @Input() language: SupportedLanguage = "typescript";
  @Input() theme: EditorTheme = "dark";
  @Input() readonly = false;
  @Input() lineNumbers = true;
  @Input() height = "300px";
  @Input() fontSize = "14";
  @Input() placeholder = "";
  @Input() tabSize = 2;
  @Input() wordWrap = false;

  // Outputs
  @Output() valueChange = new EventEmitter<string>();
  @Output() focus = new EventEmitter<void>();
  @Output() blur = new EventEmitter<void>();
  @Output() ready = new EventEmitter<void>();
  @Output() cursorActivity = new EventEmitter<{
    line: number;
    column: number;
  }>();

  private editorView!: EditorView;
  private languageCompartment = new Compartment();
  private themeCompartment = new Compartment();
  private readonlyCompartment = new Compartment();
  private lineNumbersCompartment = new Compartment();
  private wordWrapCompartment = new Compartment();

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initializeEditor();
    });

    // Set container height
    if (this.editorContainer?.nativeElement) {
      this.editorContainer.nativeElement.style.height = this.height;
      this.editorContainer.nativeElement.style.setProperty(
        "--web-editor-font-size",
        `${this.fontSize}px`,
      );
    }

    this.ready.emit();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.editorView) return;

    // Handle value change from outside
    if (changes["value"] && !changes["value"].firstChange) {
      const currentValue = this.editorView.state.doc.toString();
      if (currentValue !== this.value) {
        this.editorView.dispatch({
          changes: { from: 0, to: currentValue.length, insert: this.value },
        });
      }
    }

    // Handle language change
    if (changes["language"] && !changes["language"].firstChange) {
      this.updateLanguage();
    }

    // Handle theme change
    if (changes["theme"] && !changes["theme"].firstChange) {
      this.updateTheme();
    }

    // Handle readonly change
    if (changes["readonly"] && !changes["readonly"].firstChange) {
      this.updateReadonly();
    }

    // Handle line numbers change
    if (changes["lineNumbers"] && !changes["lineNumbers"].firstChange) {
      this.updateLineNumbers();
    }

    // Handle word wrap change
    if (changes["wordWrap"] && !changes["wordWrap"].firstChange) {
      this.updateWordWrap();
    }

    // Handle height change
    if (
      changes["height"] &&
      !changes["height"].firstChange &&
      this.editorContainer?.nativeElement
    ) {
      this.editorContainer.nativeElement.style.height = this.height;
    }

    // Handle font size change
    if (
      changes["fontSize"] &&
      !changes["fontSize"].firstChange &&
      this.editorContainer?.nativeElement
    ) {
      this.editorContainer.nativeElement.style.setProperty(
        "--web-editor-font-size",
        `${this.fontSize}px`,
      );
    }
  }

  ngOnDestroy(): void {
    if (this.editorView) {
      this.editorView.destroy();
    }
  }

  private async initializeEditor(): Promise<void> {
    const languageSupport = await getLanguageSupport(this.language);

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
      this.readonlyCompartment.of(EditorState.readOnly.of(this.readonly)),

      // Line numbers
      this.lineNumbersCompartment.of(this.lineNumbers ? lineNumbers() : []),

      // Word wrap
      this.wordWrapCompartment.of(this.wordWrap ? EditorView.lineWrapping : []),

      // Tab size
      EditorState.tabSize.of(this.tabSize),

      // Update listener
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString();
          this.ngZone.run(() => {
            this.valueChange.emit(newValue);
          });
        }

        // Cursor activity
        const { head } = update.state.selection.main;
        const line = update.state.doc.lineAt(head);
        this.ngZone.run(() => {
          this.cursorActivity.emit({
            line: line.number,
            column: head - line.from,
          });
        });
      }),

      // Focus/blur listeners
      EditorView.focusChangeEffect.of((state, focusing) => {
        if (focusing) {
          this.ngZone.run(() => this.focus.emit());
        } else {
          this.ngZone.run(() => this.blur.emit());
        }
        return null;
      }),
    ];

    // Add placeholder if provided
    if (this.placeholder) {
      const { placeholder } = await import("@codemirror/view");
      extensions.push(placeholder(this.placeholder));
    }

    this.editorView = new EditorView({
      state: EditorState.create({
        doc: this.value,
        extensions,
      }),
      parent: this.editorContainer.nativeElement,
    });
  }

  private async updateLanguage(): Promise<void> {
    const languageSupport = await getLanguageSupport(this.language);
    if (languageSupport) {
      this.editorView.dispatch({
        effects: this.languageCompartment.reconfigure(languageSupport),
      });
    }
  }

  private updateTheme(): void {
    this.editorView.dispatch({
      effects: this.themeCompartment.reconfigure(this.getThemeExtension()),
    });
  }

  private getThemeExtension(): Extension {
    if (this.theme === "dark") {
      return oneDark;
    }
    return [];
  }

  private updateReadonly(): void {
    this.editorView.dispatch({
      effects: this.readonlyCompartment.reconfigure(
        EditorState.readOnly.of(this.readonly),
      ),
    });
  }

  private updateLineNumbers(): void {
    this.editorView.dispatch({
      effects: this.lineNumbersCompartment.reconfigure(
        this.lineNumbers ? lineNumbers() : [],
      ),
    });
  }

  private updateWordWrap(): void {
    this.editorView.dispatch({
      effects: this.wordWrapCompartment.reconfigure(
        this.wordWrap ? EditorView.lineWrapping : [],
      ),
    });
  }

  // Public API methods

  /**
   * Get the current editor value
   */
  getValue(): string {
    return this.editorView?.state.doc.toString() || "";
  }

  /**
   * Set the editor value
   */
  setValue(value: string): void {
    if (this.editorView) {
      const currentValue = this.editorView.state.doc.toString();
      this.editorView.dispatch({
        changes: { from: 0, to: currentValue.length, insert: value },
      });
    }
  }

  /**
   * Insert text at the current cursor position
   */
  insertText(text: string): void {
    if (this.editorView) {
      const { from } = this.editorView.state.selection.main;
      this.editorView.dispatch({
        changes: { from, insert: text },
      });
    }
  }

  /**
   * Focus the editor
   */
  focusEditor(): void {
    this.editorView?.focus();
  }

  /**
   * Get the underlying CodeMirror EditorView instance
   */
  getEditorView(): EditorView | null {
    return this.editorView || null;
  }

  /**
   * Format the code (if formatter available)
   * Note: Basic implementation, can be extended with Prettier
   */
  async format(): Promise<void> {
    // Placeholder for formatting functionality
    // Can be implemented with Prettier or similar
    console.log("Format functionality - to be implemented");
  }
}
