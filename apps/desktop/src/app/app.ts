import { Component, signal, forwardRef, inject } from '@angular/core';
import {
  MainLayoutComponent,
  EditorComponent,
  SidebarComponent,
  BottomPanelComponent,
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
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly fileService = inject(FileService);

  protected readonly title = signal('Vertex IDE');
  protected readonly activeFile = signal<VertexFile | null>(null);
  protected readonly rootFolder = signal<VertexFolder | null>(null);

  constructor() {
    // Initial load - using current working directory
    this.fileService.getFiles('.').subscribe((folder: VertexFolder) => {
      this.rootFolder.set(folder);
    });
  }

  onFileSelect(file: VertexFile) {
    if (!file.content) {
      this.fileService.readFile(file.path).subscribe((content: string) => {
        file.content = content;
        this.activeFile.set(file);
      });
    } else {
      this.activeFile.set(file);
    }
  }
}
