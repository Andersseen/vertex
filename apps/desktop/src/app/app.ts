import { Component, signal, forwardRef } from '@angular/core';
import {
  MainLayoutComponent,
  EditorComponent,
  SidebarComponent,
  BottomPanelComponent,
  TabsComponent,
} from '@vertex/ui';
import { VertexFile, VertexFolder } from '@vertex/types';

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
  protected readonly title = signal('Vertex IDE');

  protected readonly activeFile = signal<VertexFile>({
    id: '1',
    name: 'app.ts',
    path: 'apps/desktop/src/app/app.ts',
    content:
      "import { Component } from '@angular/core';\n\n@Component({\n  selector: 'app-root', \n  template: '<h1>Hello Vertex</h1>'\n})\nexport class App {}",
    language: 'typescript',
    isDirty: false,
  });

  protected readonly rootFolder = signal<VertexFolder>({
    id: 'root',
    name: 'vertex-project',
    path: '/',
    isExpanded: true,
    children: [
      {
        id: 'dir-src',
        name: 'src',
        path: '/src',
        isExpanded: true,
        children: [
          {
            id: 'dir-app',
            name: 'app',
            path: '/src/app',
            isExpanded: true,
            children: [
              {
                id: 'app-comp',
                name: 'app.component.ts',
                path: '/src/app/app.component.ts',
                content: '// App Component',
                language: 'typescript',
                isDirty: false,
              },
              {
                id: 'app-html',
                name: 'app.component.html',
                path: '/src/app/app.component.html',
                content: '<!-- App HTML -->',
                language: 'html',
                isDirty: false,
              },
              {
                id: 'app-css',
                name: 'app.component.css',
                path: '/src/app/app.component.css',
                content: '/* App CSS */',
                language: 'css',
                isDirty: false,
              },
            ],
          },
          {
            id: 'index-html',
            name: 'index.html',
            path: '/src/index.html',
            content:
              '<!DOCTYPE html>\n<html>\n<head>\n  <title>Vertex IDE</title>\n</head>\n<body>\n  <app-root></app-root>\n</body>\n</html>',
            language: 'html',
            isDirty: false,
          },
          {
            id: 'main-ts',
            name: 'main.ts',
            path: '/src/main.ts',
            content: '// Main entry point',
            language: 'typescript',
            isDirty: false,
          },
        ],
      },
      {
        id: 'readme',
        name: 'README.md',
        path: '/README.md',
        content: '# Vertex IDE\n\nModular, High-Performance IDE.',
        language: 'markdown',
        isDirty: false,
      },
      {
        id: 'package-json',
        name: 'package.json',
        path: '/package.json',
        content: '{\n  "name": "vertex-desktop",\n  "version": "1.0.0"\n}',
        language: 'json',
        isDirty: false,
      },
      {
        id: 'tsconfig',
        name: 'tsconfig.json',
        path: '/tsconfig.json',
        content: '{\n  "extends": "../../tsconfig.json"\n}',
        language: 'json',
        isDirty: false,
      },
    ],
  });

  onFileSelect(file: VertexFile) {
    this.activeFile.set(file);
  }
}
