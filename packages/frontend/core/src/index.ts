import { Injectable, signal, computed } from "@angular/core";
import { VertexConfig, Workspace } from "@vertex/types";

@Injectable({
  providedIn: "root",
})
export class ConfigService {
  // Private writable signal
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

  // Public readonly signal
  readonly configSignal = this.config.asReadonly();

  // Computed signals for common access patterns
  readonly editorConfig = computed(() => this.config().editor);
  readonly workspacePath = computed(() => this.config().workspacePath);

  /**
   * Get current config value (synchronous)
   */
  getConfig(): VertexConfig {
    return this.config();
  }

  /**
   * Update config with partial updates (immutable)
   */
  updateConfig(updates: Partial<VertexConfig>): void {
    this.config.update((current) => ({ ...current, ...updates }));
  }

  /**
   * Set config completely (replace)
   */
  setConfig(config: VertexConfig): void {
    this.config.set(config);
  }

  /**
   * Update editor config specifically
   */
  updateEditorConfig(updates: Partial<VertexConfig["editor"]>): void {
    this.config.update((current) => ({
      ...current,
      editor: { ...current.editor, ...updates },
    }));
  }
}

@Injectable({
  providedIn: "root",
})
export class WorkspaceService {
  // Private writable signal
  private workspace = signal<Workspace | null>(null);

  // Public readonly signal
  readonly workspaceSignal = this.workspace.asReadonly();

  // Computed signals
  readonly hasWorkspace = computed(() => this.workspace() !== null);
  readonly currentWorkspace = computed(() => this.workspace());

  /**
   * Open a workspace
   */
  openWorkspace(workspace: Workspace): void {
    this.workspace.set(workspace);
  }

  /**
   * Close current workspace
   */
  closeWorkspace(): void {
    this.workspace.set(null);
  }

  /**
   * Get current workspace value (synchronous)
   */
  getCurrentWorkspace(): Workspace | null {
    return this.workspace();
  }

  /**
   * Update current workspace
   */
  updateWorkspace(updates: Partial<Workspace>): void {
    this.workspace.update((current) => {
      if (!current) return null;
      return { ...current, ...updates };
    });
  }
}

export * from "./terminal/terminal-backend-adapter";
export * from "./terminal/terminal-tokens";
export * from "./terminal/tauri-terminal.service";
export * from "./terminal/web-terminal.service";
export * from "./fs/file.service";
export * from "./fs/tauri.service";
