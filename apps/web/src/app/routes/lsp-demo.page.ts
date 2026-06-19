import { Component, signal, ChangeDetectionStrategy, effect, inject } from '@angular/core';
import { EditorComponent } from '@vertex/ui';
import { tsLspExtensions, warmupTsLsp } from '@vertex/ui';
import { tsLanguageService, type LspStatus } from '@vertex/runtime/lsp';
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
        <div class="lsp-demo__title">
          <h1>TypeScript LSP Demo</h1>
          <span class="lsp-demo__status" [class]="'lsp-demo__status--' + lspStatus()">
            {{ statusLabel() }}
          </span>
        </div>
        <p>
          Hover over symbols for type info, type <code>.</code> for autocomplete,
          and introduce type errors to see diagnostics.
        </p>
      </header>
      <div class="lsp-demo__editor">
        <v-editor
          [file]="demoFile()"
          [extensions]="editorExtensions()"
          (contentChange)="onContentChange($event)">
        </v-editor>
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

    .lsp-demo__title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 6px;
    }

    .lsp-demo__header h1 {
      margin: 0;
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

    .lsp-demo__status {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--ide-surface-700, #222);
      color: var(--ide-text-muted, #888);
    }

    .lsp-demo__status--loading {
      background: #3b82f6;
      color: #fff;
    }

    .lsp-demo__status--ready {
      background: #22c55e;
      color: #fff;
    }

    .lsp-demo__status--error {
      background: #ef4444;
      color: #fff;
    }

    .lsp-demo__editor {
      flex: 1;
      min-height: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LspDemoPageComponent {
  private readonly lsp = tsLanguageService;

  protected readonly demoFile = signal<VertexFile>({
    id: 'lsp-demo',
    name: 'lsp-demo.ts',
    path: '/lsp-demo.ts',
    content: DEMO_TS_CODE,
    language: 'typescript',
    isDirty: false,
  });

  protected readonly lspStatus = signal<LspStatus>('idle');
  protected readonly statusLabel = signal('LSP idle');

  protected readonly editorExtensions = signal(tsLspExtensions('/lsp-demo.ts'));

  constructor() {
    // Subscribe to LSP status changes for UI feedback
    this.lsp.onStatusChange((status) => {
      this.lspStatus.set(status);
      this.statusLabel.set(
        status === 'loading'
          ? 'LSP loading...'
          : status === 'ready'
          ? 'LSP ready'
          : status === 'error'
          ? 'LSP error'
          : 'LSP idle',
      );
    });

    // Prime the LSP by updating the file once on init
    warmupTsLsp('/lsp-demo.ts', DEMO_TS_CODE).catch(() => {
      // Errors are surfaced via status listeners.
    });

    effect(() => {
      const file = this.demoFile();
      if (file.content) {
        this.lsp.updateFile(file.path, file.content).catch(() => {
          // Errors are surfaced via status
        });
      }
    });
  }

  protected onContentChange(content: string): void {
    this.demoFile.update((file) => ({ ...file, content, isDirty: true }));
  }
}
