import { Component, signal, inject } from '@angular/core';
import { MainLayoutComponent } from '../../../../packages/frontend/ui/src/lib/layouts/main-layout/main-layout.component';
import { EditorComponent } from '../../../../packages/frontend/ui/src/components/editor/editor.component';
import { SidebarComponent } from '../../../../packages/frontend/ui/src/components/sidebar/sidebar.component';
import { BottomPanelComponent } from '../../../../packages/frontend/ui/src/components/bottom-panel/bottom-panel.component';
import { TabsComponent } from '../../../../packages/frontend/ui/src/components/tabs/tabs.component';
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
})
export class App {
  private readonly fileService = inject(FileService);

  protected readonly title = signal('Vertex IDE Web');
  protected readonly openFiles = signal<VertexFile[]>([]);
  protected readonly activeFileId = signal<string | null>(null);
  protected readonly rootFolder = signal<VertexFolder | null>(null);

  constructor() {
    // Initial load - using current working directory as default project root
    this.fileService.getFiles('.').subscribe({
      next: (folder: VertexFolder) => {
        this.rootFolder.set(folder);

        // Auto-open first file for E2E tests and better DX
        if (folder.children && folder.children.length > 0) {
          const firstFile = folder.children.find((f) => !('children' in f)) as VertexFile;
          if (firstFile) {
            this.onFileSelect(firstFile);
          }
        }
      },
      error: (err) => {
        console.error(`[App] Failed to load root folder:`, err);
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
      this.fileService.getFiles(path).subscribe({
        next: (folder: VertexFolder) => {
          this.rootFolder.set(folder);
        },
        error: (err) => {
          console.error(`[App] Failed to load folder: ${path}`, err);
          window.alert(`Failed to load folder: ${path}`);
        },
      });
    }
  }

  protected getActiveFile(): VertexFile | undefined {
    const id = this.activeFileId();
    return id ? this.openFiles().find((f) => f.id === id) : undefined;
  }

  onFileSelect(file: VertexFile) {
    // 1. Set as active immediately for UI responsiveness
    this.activeFileId.set(file.id);

    // 2. Check if we already have this file open
    const openFiles = this.openFiles();
    const existingFile = openFiles.find(f => f.id === file.id);

    // 3. Handle content loading and list update
    if (!file.content && (!existingFile || !existingFile.content)) {
      this.fileService.readFile(file.path).subscribe((content: string) => {
        const updatedFile = { ...file, content };
        this.updateOrAddFile(updatedFile);
      });
    } else {
      // If the incoming file has no content but the existing one does, 
      // preserve the existing one but still call updateOrAddFile to handle potential 
      // reference updates from sidebar tree refreshes
      const fileToUse = (!file.content && existingFile?.content) 
        ? { ...file, content: existingFile.content } 
        : file;
      this.updateOrAddFile(fileToUse);
    }
  }

  private updateOrAddFile(file: VertexFile) {
    const currentOpenFiles = this.openFiles();
    const existingIndex = currentOpenFiles.findIndex((f) => f.id === file.id);

    if (existingIndex === -1) {
      // New file, add to tabs
      this.openFiles.set([...currentOpenFiles, file]);
    } else {
      // Existing file, update the reference to ensure it's in sync with sidebar/latest content
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
        isDirty: true
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

    // If closed file was active, switch to first remaining
    if (this.activeFileId() === file.id && filteredFiles.length > 0) {
      this.activeFileId.set(filteredFiles[0].id);
    } else if (filteredFiles.length === 0) {
      this.activeFileId.set(null);
    }
  }
}
