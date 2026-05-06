import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  viewChild,
} from "@angular/core";
import {
  defaultHighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { Compartment, EditorState, Extension } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  drawSelection,
  EditorView,
  highlightSpecialChars,
  lineNumbers,
} from "@codemirror/view";
import { AttributeObserver } from "./attribute-observer";
import type { SupportedLanguage } from "./language-support-lite";
import { getLanguageSupport } from "./language-support-lite";

export type EditorTheme = "dark" | "light";

export interface CursorPosition {
  line: number;
  column: number;
  index: number;
}

/**
 * Vertex Editor Lite - Read-only code display component
 *
 * Optimized for:
 * - Bundle size (minimal dependencies)
 * - Performance (no polling, no editing features)
 * - Simple usage (just display code)
 *
 * REMOVED vs Full Version:
 * - Search functionality
 * - Autocomplete
 * - Multiple cursors/selections
 * - Drag & drop
 * - Command palette
 * - Markdown support
 * - Polling for attribute changes
 *
 * SIZE: ~500KB minified (vs ~1.6MB full version)
 */
@Component({
  selector: "v-editor-internal",
  template: `<div #editorContainer class="vertex-editor-container"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .vertex-editor-container {
        width: 100%;
        height: 100%;
        overflow: auto;
      }
      /* Line numbers styling */
      :host ::ng-deep .cm-gutters {
        background: transparent;
        border-right: 1px solid var(--editor-border, #ddd);
      }
      /* Dark theme line numbers */
      :host ::ng-deep .cm-dark .cm-gutters {
        border-color: var(--editor-border-dark, #444);
      }
    `,
  ],
})
export class WebEditorLiteComponent implements AfterViewInit, OnDestroy {
  // Signals for reactive inputs
  readonly value = input<string>("");
  readonly language = input<SupportedLanguage>("javascript");
  readonly theme = input<EditorTheme>("dark");
  readonly lineNumbers = input<boolean>(true);
  readonly wordWrap = input<boolean>(false);
  readonly readOnly = input<boolean>(true); // Always read-only in lite version

  readonly cursorActivity = output<CursorPosition>();
  readonly ready = output<void>();

  editorContainer = viewChild.required<ElementRef<HTMLDivElement>>("editorContainer");
  private hostElement = inject(ElementRef).nativeElement as HTMLElement;
  private editorView: EditorView | null = null;

  // Compartments for dynamic updates
  private languageCompartment = new Compartment();
  private themeCompartment = new Compartment();
  private lineNumbersCompartment = new Compartment();
  private wordWrapCompartment = new Compartment();

  private attributeObserver: AttributeObserver | null = null;
  private isInitialized = false;

  ngAfterViewInit(): void {
    // Get initial value from attribute (handles async loading)
    const initialValue =
      this.hostElement.getAttribute("value") || this.value() || "";

    // Setup attribute observer (MutationObserver only, no polling)
    this.attributeObserver = new AttributeObserver(this.hostElement, {
      onValueChange: (v) => this.handleValueChange(v),
      onThemeChange: (t) => this.handleThemeChange(t as EditorTheme),
    });
    this.attributeObserver.start();

    // Initialize editor
    this.initializeEditor(initialValue);
  }

  ngOnDestroy(): void {
    this.attributeObserver?.stop();
    this.editorView?.destroy();
  }

  private async initializeEditor(initialValue: string): Promise<void> {
    const extensions = await this.createExtensions();

    const state = EditorState.create({
      doc: initialValue,
      extensions,
    });

    this.editorView = new EditorView({
      state,
      parent: this.editorContainer().nativeElement,
    });

    this.isInitialized = true;
    this.ready.emit();
  }

  private async createExtensions(): Promise<Extension[]> {
    const extensions: Extension[] = [
      // Basic display
      highlightSpecialChars(),
      drawSelection(),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

      // Always read-only in lite version
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),

      // Dynamic compartments
      this.themeCompartment.of(this.getThemeExtension()),
      this.lineNumbersCompartment.of(this.getLineNumbersExtension()),
      this.wordWrapCompartment.of(this.getWordWrapExtension()),
    ];

    // Language support (async)
    const langSupport = await getLanguageSupport(this.language());
    extensions.push(
      this.languageCompartment.of(langSupport ? [langSupport] : []),
    );

    // Cursor activity tracking
    extensions.push(
      EditorView.updateListener.of((update) => {
        if (update.selectionSet) {
          this.emitCursorPosition();
        }
      }),
    );

    return extensions;
  }

  private getThemeExtension(): Extension {
    const theme = this.theme();
    if (theme === "dark") {
      return oneDark;
    }
    // Light theme is default (no extension needed)
    return [];
  }

  private getLineNumbersExtension(): Extension {
    if (!this.lineNumbers()) return [];
    return lineNumbers();
  }

  private getWordWrapExtension(): Extension {
    if (!this.wordWrap()) return [];
    return EditorView.lineWrapping;
  }

  private handleValueChange(newValue: string): void {
    if (!this.editorView || !this.isInitialized) return;

    const currentDoc = this.editorView.state.doc.toString();
    if (newValue !== currentDoc) {
      this.editorView.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: newValue,
        },
      });
    }
  }

  private handleThemeChange(newTheme: EditorTheme): void {
    if (!this.editorView) return;

    this.editorView.dispatch({
      effects: this.themeCompartment.reconfigure(this.getThemeExtension()),
    });
  }

  private emitCursorPosition(): void {
    if (!this.editorView) return;

    const { head } = this.editorView.state.selection.main;
    const line = this.editorView.state.doc.lineAt(head);

    this.cursorActivity.emit({
      line: line.number,
      column: head - line.from + 1,
      index: head,
    });
  }

  // Public API for programmatic access
  getEditorView(): EditorView | null {
    return this.editorView;
  }

  setValue(value: string): void {
    this.handleValueChange(value);
  }

  getValue(): string {
    return this.editorView?.state.doc.toString() || "";
  }
}
