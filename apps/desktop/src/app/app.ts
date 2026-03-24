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
  protected readonly title = signal('Vertex IDE');
  
  protected readonly activeFile = signal<VertexFile>({
    id: '1',
    name: 'app.ts',
    path: 'apps/desktop/src/app/app.ts',
    content: "import { Component } from '@angular/core';\n\n@Component({\n  selector: 'app-root', \n  template: '<h1>Hello Vertex</h1>'\n})\nexport class App {}",
    language: 'typescript',
    isDirty: false
  });

  protected readonly rootFolder = signal<VertexFolder>({
    id: 'root',
    name: 'vertex-project',
    path: '/',
    isExpanded: true,
    children: [
      { id: '2', name: 'package.json', path: '/package.json', content: '{}', language: 'json', isDirty: false },
      { id: '3', name: 'src', path: '/src', isExpanded: true, children: [] }
    ]
  });

  onFileSelect(file: VertexFile) {
    this.activeFile.set(file);
  }
}
