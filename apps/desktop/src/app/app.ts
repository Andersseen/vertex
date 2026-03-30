import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import {
  MainLayoutComponent,
  EditorComponent,
  SidebarComponent,
  BottomPanelComponent,
  TabsComponent,
} from '@vertex/ui';
import { VertexFile, VertexFolder } from '@vertex/types';
import { FileService, TauriService, WorkspaceService } from '@vertex/core';

@Component({
  selector: 'app-root',
  imports: [
    MainLayoutComponent,
    EditorComponent,
    SidebarComponent,
    BottomPanelComponent,
    TabsComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly tauriService = inject(TauriService);
  private readonly fileService = inject(FileService);
  private readonly workspaceService = inject(WorkspaceService);

  protected readonly title = signal('Vertex IDE');
  protected readonly openFiles = signal<VertexFile[]>([]);
  protected readonly activeFileId = signal<string | null>(null);
  protected readonly rootFolder = signal<VertexFolder | null>(null);
  protected readonly workspacePath = signal<string>('');

  constructor() {
    // Initial load - using current working directory as default
    this.loadDirectory('.', 'Vertex Project');
  }

  private loadDirectory(path: string, name?: string) {
    this.fileService.getFiles(path).subscribe((folder: VertexFolder) => {
      this.rootFolder.set(folder);
      // Store the absolute path for the terminal
      this.workspacePath.set(folder.path);

      // Update workspace service so terminal knows where to start
      const folderName = name || folder.name || 'Project';
      this.workspaceService.openWorkspace({
        id: path,
        name: folderName,
        path: path,
        files: folder,
        panels: [],
      });

      // Auto-open first file for better UX
      if (folder.children && folder.children.length > 0) {
        const firstFile = folder.children.find((f) => !('children' in f)) as VertexFile;
        if (firstFile) {
          this.openFile(firstFile);
        }
      }
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
    this.openFile(file);
  }

  private openFile(file: VertexFile) {
    // Check if file is already open
    const existingFile = this.openFiles().find((f) => f.id === file.id);

    if (existingFile) {
      // Just activate the existing tab
      this.activeFileId.set(file.id);
      return;
    }

    // Load file content if not already loaded
    if (!file.content) {
      this.fileService.readFile(file.path).subscribe((content: string) => {
        const updatedFile = { ...file, content };
        this.addOrUpdateFile(updatedFile);
      });
    } else {
      this.addOrUpdateFile(file);
    }
  }

  private addOrUpdateFile(file: VertexFile) {
    const currentFiles = this.openFiles();
    const existingIndex = currentFiles.findIndex((f) => f.id === file.id);

    if (existingIndex === -1) {
      // Add new file to tabs
      this.openFiles.set([...currentFiles, file]);
    } else {
      // Update existing file
      const updatedFiles = [...currentFiles];
      updatedFiles[existingIndex] = file;
      this.openFiles.set(updatedFiles);
    }

    // Activate the file
    this.activeFileId.set(file.id);
  }

  onTabSelect(file: VertexFile) {
    this.activeFileId.set(file.id);
  }

  onTabClose(file: VertexFile) {
    const currentFiles = this.openFiles();
    const filteredFiles = currentFiles.filter((f) => f.id !== file.id);
    this.openFiles.set(filteredFiles);

    // If closed file was active, switch to another one
    if (this.activeFileId() === file.id) {
      if (filteredFiles.length > 0) {
        this.activeFileId.set(filteredFiles[filteredFiles.length - 1].id);
      } else {
        this.activeFileId.set(null);
      }
    }
  }

  onNewTab() {
    // Create a new untitled file
    const newFile: VertexFile = {
      id: `untitled-${Date.now()}`,
      name: 'Untitled',
      path: 'untitled',
      content: '',
      language: 'text',
      isDirty: true,
    };
    this.addOrUpdateFile(newFile);
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
    const activeFile = this.getActiveFile();
    if (activeFile && activeFile.content !== undefined) {
      this.fileService.writeFile(activeFile.path, activeFile.content).subscribe(() => {
        activeFile.isDirty = false;
        this.addOrUpdateFile(activeFile);
      });
    }
  }

  onContentChange(content: string) {
    const activeFile = this.getActiveFile();
    if (activeFile) {
      const updatedFile = { ...activeFile, content, isDirty: true };
      this.addOrUpdateFile(updatedFile);
    }
  }

  protected getActiveFile(): VertexFile | null {
    const id = this.activeFileId();
    if (!id) return null;
    return this.openFiles().find((f) => f.id === id) || null;
  }
}
