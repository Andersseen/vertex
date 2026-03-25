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
  protected readonly title = signal('Vertex IDE Web');

  // Open files for tabs
  protected readonly openFiles = signal<VertexFile[]>([
    {
      id: '1',
      name: 'index.html',
      path: 'apps/web/src/index.html',
      content:
        '<!DOCTYPE html>\n<html>\n<head>\n  <title>Vertex Web</title>\n</head>\n<body>\n  <app-root></app-root>\n</body>\n</html>',
      language: 'html',
      isDirty: false,
    },
    {
      id: '2',
      name: 'main.ts',
      path: '/src/main.ts',
      content:
        "// Main entry point\nimport { bootstrapApplication } from '@angular/platform-browser';\nimport { AppComponent } from './app/app.component';\n\nbootstrapApplication(AppComponent);",
      language: 'typescript',
      isDirty: false,
    },
  ]);

  // Active file (currently selected in editor)
  protected readonly activeFileId = signal<string>('1');

  // Helper to get the active file object
  protected getActiveFile(): VertexFile | undefined {
    return this.openFiles().find((f) => f.id === this.activeFileId());
  }

  protected readonly rootFolder = signal<VertexFolder>({
    id: 'root',
    name: 'web-project',
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
              '<!DOCTYPE html>\n<html>\n<head>\n  <title>Vertex Web</title>\n</head>\n<body>\n  <app-root></app-root>\n</body>\n</html>',
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
        content: '{\n  "name": "vertex-web",\n  "version": "1.0.0"\n}',
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
    this.activeFileId.set(file.id);

    // If file is not already open, add it to open files
    const currentOpenFiles = this.openFiles();
    if (!currentOpenFiles.find((f) => f.id === file.id)) {
      this.openFiles.set([...currentOpenFiles, file]);
    }
  }

  onTabSelect(file: VertexFile) {
    this.activeFileId.set(file.id);
  }

  onTabClose(file: VertexFile, event?: Event) {
    event?.stopPropagation();
    const currentFiles = this.openFiles();
    const filteredFiles = currentFiles.filter((f) => f.id !== file.id);
    this.openFiles.set(filteredFiles);

    // If closed file was active, switch to first remaining
    if (this.activeFileId() === file.id && filteredFiles.length > 0) {
      this.activeFileId.set(filteredFiles[0].id);
    }
  }
}
