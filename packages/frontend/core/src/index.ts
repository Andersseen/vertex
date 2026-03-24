import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { VertexConfig, Workspace } from '@vertex/types';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private configSubject = new BehaviorSubject<VertexConfig>({
    editor: {
      theme: 'dark',
      fontSize: 14,
      fontFamily: 'Monaco, Consolas, monospace',
      tabSize: 2,
      wordWrap: true,
      minimap: true
    },
    keybindings: {},
    lastOpenedFiles: [],
    workspacePath: ''
  });

  config$: Observable<VertexConfig> = this.configSubject.asObservable();

  getConfig(): VertexConfig {
    return this.configSubject.value;
  }

  updateConfig(updates: Partial<VertexConfig>): void {
    const currentConfig = this.configSubject.value;
    this.configSubject.next({ ...currentConfig, ...updates });
  }
}

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private workspaceSubject = new BehaviorSubject<Workspace | null>(null);
  
  workspace$: Observable<Workspace | null> = this.workspaceSubject.asObservable();

  openWorkspace(workspace: Workspace): void {
    this.workspaceSubject.next(workspace);
  }

  closeWorkspace(): void {
    this.workspaceSubject.next(null);
  }

  getCurrentWorkspace(): Workspace | null {
    return this.workspaceSubject.value;
  }
}
