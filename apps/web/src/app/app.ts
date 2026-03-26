import { Component, signal, forwardRef, inject } from '@angular/core';
import {
  MainLayoutComponent,
  EditorComponent,
  SidebarComponent,
  BottomPanelComponent,
  TabsComponent,
} from '@vertex/ui';
import { VertexFile, VertexFolder } from '@vertex/types';
import { FileService } from '@vertex/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    forwardRef(() => MainLayoutComponent),
    forwardRef(() => EditorComponent),
    forwardRef(() => SidebarComponent),
    forwardRef(() => BottomPanelComponent),
    forwardRef(() => TabsComponent),
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
    this.fileService.getFiles('.').subscribe((folder: VertexFolder) => {
      this.rootFolder.set(folder);
    });
  }

  protected getActiveFile(): VertexFile | undefined {
    const id = this.activeFileId();
    return id ? this.openFiles().find((f) => f.id === id) : undefined;
  }

  onFileSelect(file: VertexFile) {
    this.activeFileId.set(file.id);

    // Load content if not already loaded
    if (!file.content) {
      this.fileService.readFile(file.path).subscribe((content: string) => {
        file.content = content;
        this.addFileToOpen(file);
      });
    } else {
      this.addFileToOpen(file);
    }
  }

  private addFileToOpen(file: VertexFile) {
    const currentOpenFiles = this.openFiles();
    if (!currentOpenFiles.find((f) => f.id === file.id)) {
      this.openFiles.set([...currentOpenFiles, file]);
    }
  }

  onTabSelect(file: VertexFile) {
    this.activeFileId.set(file.id);
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
