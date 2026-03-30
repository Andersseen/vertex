import { Component, signal, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { MainLayoutComponent } from '@vertex/ui';
import { EditorComponent } from '@vertex/ui';
import { SidebarComponent } from '@vertex/ui';
import { BottomPanelComponent } from '@vertex/ui';
import { TabsComponent } from '@vertex/ui';
import { VertexFile, VertexFolder } from '@vertex/types';
import { FileService } from '@vertex/core';

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
  private readonly fileService = inject(FileService);

  protected readonly title = signal('Vertex IDE Web');
  protected readonly openFiles = signal<VertexFile[]>([]);
  protected readonly activeFileId = signal<string | null>(null);
  protected readonly rootFolder = signal<VertexFolder | null>(null);
  protected readonly workspacePath = signal<string>('');

  // COMPUTED SIGNAL — prevents NG0103 infinite change detection loop
  protected readonly activeFile = computed(() => {
    const id = this.activeFileId();
    if (!id) return null;
    return this.openFiles().find((f) => f.id === id) ?? null;
  });

  constructor() {
    // Fetch the absolute workspace path to pass to the terminal
    this.fileService.getWorkspace().subscribe({
      next: (workspace) => {
        const absolutePath = workspace.path;
        console.log(`[App] Workspace resolved to: ${absolutePath}`);
        this.workspacePath.set(absolutePath);
        this.loadDirectory(absolutePath);
      },
      error: () => {
        this.loadDirectory('.');
      },
    });
  }

  private loadDirectory(path: string) {
    this.fileService.getFiles(path).subscribe({
      next: (folder: VertexFolder) => {
        this.rootFolder.set({ ...folder, path });

        // Auto-open first file for E2E tests and better DX
        if (folder.children && folder.children.length > 0) {
          const firstFile = folder.children.find((f) => !('children' in f)) as VertexFile;
          if (firstFile) {
            this.onFileSelect(firstFile);
          }
        }
      },
      error: (err) => {
        console.error(`[App] Failed to load folder:`, err);
      },
    });
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

  openFolder() {
    const path = window.prompt(
      'Enter absolute path to workspace folder:',
      this.rootFolder()?.path || '.',
    );
    if (path) {
      this.fileService.setWorkspace(path).subscribe({
        next: () => {
          console.log(`[App] Workspace changed to: ${path}`);
          this.workspacePath.set(path);
          this.loadDirectory(path);
        },
        error: (err) => {
          console.error(`[App] Failed to set workspace: ${path}`, err);
          this.loadDirectory(path);
        },
      });
    }
  }

  onFileSelect(file: VertexFile) {
    // 1. Set as active immediately for UI responsiveness
    this.activeFileId.set(file.id);

    // 2. Check if we already have this file open
    const openFiles = this.openFiles();
    const existingFile = openFiles.find((f) => f.id === file.id);

    // 3. Handle content loading and list update
    if (!file.content && (!existingFile || !existingFile.content)) {
      this.fileService.readFile(file.path).subscribe((content: string) => {
        const updatedFile = { ...file, content };
        this.updateOrAddFile(updatedFile);
      });
    } else {
      const fileToUse =
        !file.content && existingFile?.content ? { ...file, content: existingFile.content } : file;
      this.updateOrAddFile(fileToUse);
    }
  }

  private updateOrAddFile(file: VertexFile) {
    const currentOpenFiles = this.openFiles();
    const existingIndex = currentOpenFiles.findIndex((f) => f.id === file.id);

    if (existingIndex === -1) {
      this.openFiles.set([...currentOpenFiles, file]);
    } else {
      const updatedFiles = [...currentOpenFiles];
      updatedFiles[existingIndex] = file;
      this.openFiles.set(updatedFiles);
    }
  }

  onTabSelect(file: VertexFile) {
    this.activeFileId.set(file.id);
  }

  onNewFile() {
    const name = window.prompt('Enter file name:');
    if (name) {
      const newFile: VertexFile = {
        id: `new-${Date.now()}`,
        name,
        path: name,
        content: '',
        language: 'text',
        isDirty: true,
      };
      this.updateOrAddFile(newFile);
      this.activeFileId.set(newFile.id);
    }
  }

  onTabClose(file: VertexFile, event?: MouseEvent) {
    event?.stopPropagation();
    const currentFiles = this.openFiles();
    const filteredFiles = currentFiles.filter((f) => f.id !== file.id);
    this.openFiles.set(filteredFiles);

    if (this.activeFileId() === file.id && filteredFiles.length > 0) {
      this.activeFileId.set(filteredFiles[0].id);
    } else if (filteredFiles.length === 0) {
      this.activeFileId.set(null);
    }
  }

  onContentChange(content: string) {
    const file = this.activeFile();
    if (file) {
      const updatedFile = { ...file, content, isDirty: true };
      const currentFiles = this.openFiles();
      const index = currentFiles.findIndex((f) => f.id === file.id);
      if (index !== -1) {
        const updatedFiles = [...currentFiles];
        updatedFiles[index] = updatedFile;
        this.openFiles.set(updatedFiles);
      }
    }
  }
}
