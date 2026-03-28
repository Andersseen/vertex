import { Component, signal, inject } from '@angular/core';
import {
  MainLayoutComponent,
  EditorComponent,
  SidebarComponent,
  BottomPanelComponent,
} from '@vertex/ui';
import { VertexFile, VertexFolder } from '@vertex/types';
import { FileService, TauriService, WorkspaceService } from '@vertex/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MainLayoutComponent, EditorComponent, SidebarComponent, BottomPanelComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly tauriService = inject(TauriService);
  private readonly fileService = inject(FileService);
  private readonly workspaceService = inject(WorkspaceService);

  protected readonly title = signal('Vertex IDE');
  protected readonly activeFile = signal<VertexFile | null>(null);
  protected readonly rootFolder = signal<VertexFolder | null>(null);

  constructor() {
    // Initial load - using current working directory as default
    this.loadDirectory('.', 'Vertex Project');
  }

  private loadDirectory(path: string, name?: string) {
    this.fileService.getFiles(path).subscribe((folder: VertexFolder) => {
      this.rootFolder.set(folder);

      // Update workspace service so terminal knows where to start
      const folderName = name || folder.name || 'Project';
      this.workspaceService.openWorkspace({
        id: path,
        name: folderName,
        path: path,
        files: folder,
        panels: [],
      });
    });
  }

  async openFolder() {
    const selectedPath = await this.tauriService.selectFolder();
    if (selectedPath) {
      // Extract folder name from path
      const folderName = selectedPath.split(/[/\\]/).pop() || 'Project';

      // First update the workspace in sidecar, then load the directory
      this.fileService.setWorkspace(selectedPath).subscribe({
        next: () => {
          console.log(`[App] Workspace changed to: ${selectedPath}`);
          this.loadDirectory(selectedPath, folderName);
        },
        error: (err) => {
          console.error(`[App] Failed to set workspace: ${selectedPath}`, err);
          // Try to load anyway - might fail with 403
          this.loadDirectory(selectedPath, folderName);
        },
      });
    }
  }

  onFileSelect(file: VertexFile) {
    if (!file.content) {
      this.fileService.readFile(file.path).subscribe((content: string) => {
        // Create a new instance to trigger change detection if needed
        const updatedFile = { ...file, content };
        this.activeFile.set(updatedFile);
      });
    } else {
      this.activeFile.set(file);
    }
  }

  onFolderToggle(folder: VertexFolder) {
    if (folder.isExpanded && (!folder.children || folder.children.length === 0)) {
      this.fileService
        .getChildren(folder.path)
        .subscribe((children: (VertexFile | VertexFolder)[]) => {
          folder.children = children;
          // Trigger a refresh of the rootFolder signal to update the UI
          if (this.rootFolder()) {
            this.rootFolder.set({ ...this.rootFolder()! });
          }
        });
    }
  }

  onSave() {
    const file = this.activeFile();
    if (file && file.content !== undefined) {
      this.fileService.writeFile(file.path, file.content).subscribe(() => {
        file.isDirty = false;
        this.activeFile.set({ ...file });
      });
    }
  }
}
