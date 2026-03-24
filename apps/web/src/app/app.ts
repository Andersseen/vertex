import { Component, signal } from '@angular/core';
import { MainLayoutComponent, EditorComponent, SidebarComponent } from '@vertex/ui';
import { VertexFile, VertexFolder } from '@vertex/types';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MainLayoutComponent, EditorComponent, SidebarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('Vertex IDE Web');
  
  protected readonly activeFile = signal<VertexFile>({
    id: '1',
    name: 'index.html',
    path: 'apps/web/src/index.html',
    content: "<!DOCTYPE html>\n<html>\n<head>\n  <title>Vertex Web</title>\n</head>\n<body>\n  <app-root></app-root>\n</body>\n</html>",
    language: 'html',
    isDirty: false
  });

  protected readonly rootFolder = signal<VertexFolder>({
    id: 'root',
    name: 'web-project',
    path: '/',
    isExpanded: true,
    children: [
      { id: '2', name: 'README.md', path: '/README.md', content: '# Vertex IDE', language: 'markdown', isDirty: false },
      { id: '3', name: 'src', path: '/src', isExpanded: true, children: [] }
    ]
  });

  onFileSelect(file: VertexFile) {
    this.activeFile.set(file);
  }
}
