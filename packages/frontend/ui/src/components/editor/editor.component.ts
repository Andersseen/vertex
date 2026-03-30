import {
  Component,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  input,
  output,
  viewChild,
  ElementRef,
  SimpleChanges,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { EditorState, Extension } from "@codemirror/state";
import { EditorView, basicSetup } from "codemirror";
import { keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from "@codemirror/autocomplete";
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
} from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { rust } from "@codemirror/lang-rust";
import { python } from "@codemirror/lang-python";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { VertexFile } from "@vertex/types";

type Language =
  | "javascript"
  | "typescript"
  | "html"
  | "css"
  | "json"
  | "rust"
  | "python"
  | "markdown"
  | "ts"
  | "js"
  | "md";

@Component({
  selector: "v-editor",
  imports: [CommonModule],
  templateUrl: "./editor.component.html",
  styleUrls: ["./editor.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "vx-flex vx-flex-col vx-h-full",
  },
})
export class EditorComponent implements AfterViewInit, OnDestroy, OnChanges {
  // Inputs
  readonly file = input<VertexFile | null>(null);
  readonly showHeader = input(true);
  readonly extensions = input<Extension[]>([]);

  // Outputs
  readonly contentChange = output<string>();
  readonly save = output<void>();

  // View queries
  private readonly editorHost =
    viewChild.required<ElementRef<HTMLDivElement>>("editorHost");

  // State
  private editorView: EditorView | null = null;
  private _suppressEmit = false;
  protected readonly isDirty = false;

  ngAfterViewInit(): void {
    this.initializeEditor();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["file"] && !changes["file"].firstChange && this.editorView) {
      // Only update editor if the file ID changed (switching tabs)
      // NOT when just the content object reference changed (typing updates)
      const prev = changes["file"].previousValue as VertexFile | null;
      const curr = changes["file"].currentValue as VertexFile | null;

      if (prev?.id !== curr?.id) {
        this._suppressEmit = true;
        this.updateContent(curr?.content ?? "");
        this._suppressEmit = false;
      }
    }
  }

  ngOnDestroy(): void {
    this.destroyEditor();
  }

  private getLanguageExtension(lang?: string): Extension {
    const language = lang?.toLowerCase() as Language | undefined;

    switch (language) {
      case "javascript":
      case "typescript":
      case "ts":
      case "js":
        return javascript({ typescript: true });
      case "html":
        return html();
      case "css":
        return css();
      case "json":
        return json();
      case "rust":
        return rust();
      case "python":
        return python();
      case "markdown":
      case "md":
        return markdown();
      default:
        return [];
    }
  }

  private initializeEditor(): void {
    const currentFile = this.file();
    const editorHost = this.editorHost();

    const startState = EditorState.create({
      doc: currentFile?.content ?? "",
      extensions: [
        basicSetup,
        history(),
        foldGutter(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightSelectionMatches(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
        ]),
        oneDark,
        this.getLanguageExtension(currentFile?.language),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !this._suppressEmit) {
            this.contentChange.emit(update.state.doc.toString());
          }
        }),
        ...this.extensions(),
      ],
    });

    this.editorView = new EditorView({
      state: startState,
      parent: editorHost.nativeElement,
    });
  }

  private destroyEditor(): void {
    this.editorView?.destroy();
    this.editorView = null;
  }

  protected saveFile(): void {
    this.save.emit();
  }

  private updateContent(content: string): void {
    if (!this.editorView) return;

    const state = this.editorView.state;
    this.editorView.dispatch({
      changes: {
        from: 0,
        to: state.doc.length,
        insert: content,
      },
    });
  }

  protected getFileIcon(language?: string): string {
    const iconMap: Record<string, string> = {
      typescript: "pi pi-file-edit text-blue-400",
      javascript: "pi pi-file-edit text-yellow-400",
      html: "pi pi-code text-orange-500",
      css: "pi pi-palette text-blue-500",
      json: "pi pi-info-circle text-green-400",
      md: "pi pi-file text-slate-400",
      rust: "pi pi-cog text-orange-700",
      python: "pi pi-bolt text-blue-300",
    };
    return (
      iconMap[language?.toLowerCase() ?? ""] ?? "pi pi-file text-slate-500"
    );
  }

  focus(): void {
    this.editorView?.focus();
  }
}
