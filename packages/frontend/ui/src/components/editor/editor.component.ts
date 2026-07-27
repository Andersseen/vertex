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
  computed,
} from "@angular/core";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { EditorConfigurator } from "@vertex/editor-core";
import { createWorkbenchLanguageRegistry } from "@vertex/editor-core/languages/workbench";
import { VertexFile } from "@vertex/types";
import { PluginRegistry } from "@vertex/runtime/plugins";

const languageRegistry = createWorkbenchLanguageRegistry();

@Component({
  selector: "v-editor",
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
  readonly plugins = input<PluginRegistry | null>(null);

  // Outputs
  readonly contentChange = output<string>();
  readonly save = output<void>();

  // View queries
  private readonly editorHost =
    viewChild.required<ElementRef<HTMLDivElement>>("editorHost");

  // State
  private editorView: EditorView | null = null;
  private _suppressEmit = false;
  protected readonly isDirty = computed(() => this.file()?.isDirty ?? false);
  private readonly configurator = new EditorConfigurator();
  private languageRequest = 0;

  async ngAfterViewInit(): Promise<void> {
    await this.initializeEditor();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["file"] && !changes["file"].firstChange && this.editorView) {
      // Only update editor if the file ID changed (switching tabs)
      // NOT when just the content object reference changed (typing updates)
      const prev = changes["file"].previousValue as VertexFile | null;
      const curr = changes["file"].currentValue as VertexFile | null;

      if (prev?.id !== curr?.id) {
        this._suppressEmit = true;
        void this.switchLanguage(curr?.language);
        this.updateContent(curr?.content ?? "");
        this._suppressEmit = false;
      }
    }
  }

  private async switchLanguage(language?: string): Promise<void> {
    if (!this.editorView) return;
    const request = ++this.languageRequest;
    const extension = language ? await languageRegistry.load(language) : null;
    if (!this.editorView || request !== this.languageRequest) return;
    this.editorView.dispatch({
      effects: this.configurator.languageCompartment.reconfigure(extension ?? []),
    });
  }

  ngOnDestroy(): void {
    this.destroyEditor();
  }

  private async initializeEditor(): Promise<void> {
    const currentFile = this.file();
    const editorHost = this.editorHost();

    const pluginExtensions = await this.plugins()?.resolveEditorExtensions() ?? [];
    const language = currentFile?.language
      ? await languageRegistry.load(currentFile.language)
      : null;
    const startState = this.configurator.createState({
      value: currentFile?.content ?? "",
      language,
      theme: "dark",
      extensions: [...this.extensions(), ...pluginExtensions],
      onChange: (value) => {
        if (!this._suppressEmit) this.contentChange.emit(value);
      },
      onSave: () => this.save.emit(),
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

  protected hasLspSupport(): boolean {
    const lang = this.file()?.language?.toLowerCase();
    return lang === 'typescript' || lang === 'javascript' || lang === 'ts' || lang === 'js';
  }

  protected getFileIcon(language?: string): string {
    const iconMap: Record<string, string> = {
      typescript: "TS",
      javascript: "JS",
      html: "HTML",
      css: "CSS",
      json: "JSON",
      md: "MD",
      rust: "RS",
      python: "PY",
    };
    return iconMap[language?.toLowerCase() ?? ""] ?? "FILE";
  }

  focus(): void {
    this.editorView?.focus();
  }
}
