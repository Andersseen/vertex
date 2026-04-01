import { Injectable, signal, computed } from "@angular/core";
import { VertexConfig } from "@vertex/types";

@Injectable({
  providedIn: "root",
})
export class ConfigService {
  private config = signal<VertexConfig>({
    editor: {
      theme: "dark",
      fontSize: 14,
      fontFamily: "Monaco, Consolas, monospace",
      tabSize: 2,
      wordWrap: true,
      minimap: true,
    },
    keybindings: {},
    lastOpenedFiles: [],
    workspacePath: "",
  });

  readonly configSignal = this.config.asReadonly();
  readonly editorConfig = computed(() => this.config().editor);
  readonly workspacePath = computed(() => this.config().workspacePath);

  getConfig(): VertexConfig {
    return this.config();
  }

  updateConfig(updates: Partial<VertexConfig>): void {
    this.config.update((current) => ({ ...current, ...updates }));
  }

  setConfig(config: VertexConfig): void {
    this.config.set(config);
  }

  updateEditorConfig(updates: Partial<VertexConfig["editor"]>): void {
    this.config.update((current) => ({
      ...current,
      editor: { ...current.editor, ...updates },
    }));
  }
}
