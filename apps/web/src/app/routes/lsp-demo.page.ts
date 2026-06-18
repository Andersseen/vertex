import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { EditorComponent } from '@vertex/ui';
import { tsLspExtensions } from '@vertex/ui';
import { VertexFile } from '@vertex/types';

const DEMO_TS_CODE = `// Vertex TypeScript LSP Demo
// Try: hover over variables, type a dot after an object, or introduce a type error.

interface User {
  id: number;
  name: string;
  email: string;
}

function greet(user: User): string {
  return \`Hello, \${user.name}!\`;
}

const currentUser: User = {
  id: 1,
  name: "Ada",
  email: "ada@example.com",
};

// Hover over 'greet' and 'currentUser' to see types.
const message = greet(currentUser);

// Autocomplete: type 'currentUser.' on a new line to see suggestions.
// Lint: uncomment the next line to see a type error.
// const broken: User = { id: "wrong", name: 42, email: true };

console.log(message);
`;

@Component({
  selector: 'v-lsp-demo',
  standalone: true,
  imports: [EditorComponent],
  template: `
    <div class="lsp-demo">
      <header class="lsp-demo__header">
        <h1>TypeScript LSP Demo</h1>
        <p>
          Hover over symbols for type info, type <code>.</code> for autocomplete,
          and introduce type errors to see diagnostics.
        </p>
      </header>
      <div class="lsp-demo__editor">
        <v-editor
          [file]="demoFile()"
          [extensions]="editorExtensions()"
          (contentChange)="onContentChange($event)"
        />
      </div>
    </div>
  `,
  styles: `
    .lsp-demo {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--ide-bg-950, #0a0a0a);
      color: var(--ide-text, #ddd);
    }

    .lsp-demo__header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--ide-border, #1e1e1e);
      background: var(--ide-surface-900, #111);
    }

    .lsp-demo__header h1 {
      margin: 0 0 6px;
      font-size: 18px;
      font-weight: 600;
    }

    .lsp-demo__header p {
      margin: 0;
      font-size: 13px;
      color: var(--ide-text-muted, #888);
    }

    .lsp-demo__header code {
      background: var(--ide-surface-800, #1e1e1e);
      padding: 1px 4px;
      border-radius: 3px;
      font-family: monospace;
      color: var(--ide-text, #ccc);
    }

    .lsp-demo__editor {
      flex: 1;
      min-height: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LspDemoPageComponent {
  protected readonly demoFile = signal<VertexFile>({
    id: 'lsp-demo',
    name: 'lsp-demo.ts',
    path: '/lsp-demo.ts',
    content: DEMO_TS_CODE,
    language: 'typescript',
    isDirty: false,
  });

  protected readonly editorExtensions = signal(tsLspExtensions('/lsp-demo.ts'));

  protected onContentChange(content: string): void {
    this.demoFile.update((file) => ({ ...file, content, isDirty: true }));
  }
}
