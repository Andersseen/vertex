import { Injectable, signal, computed } from "@angular/core";
import { Workspace } from "@vertex/types";

@Injectable({
  providedIn: "root",
})
export class WorkspaceService {
  private workspace = signal<Workspace | null>(null);

  readonly workspaceSignal = this.workspace.asReadonly();
  readonly hasWorkspace = computed(() => this.workspace() !== null);
  readonly currentWorkspace = computed(() => this.workspace());

  openWorkspace(workspace: Workspace): void {
    this.workspace.set(workspace);
  }

  closeWorkspace(): void {
    this.workspace.set(null);
  }

  getCurrentWorkspace(): Workspace | null {
    return this.workspace();
  }

  updateWorkspace(updates: Partial<Workspace>): void {
    this.workspace.update((current) => {
      if (!current) return null;
      return { ...current, ...updates };
    });
  }
}
