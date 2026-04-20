import {
  Component,
  input,
  signal,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';

type Tab = 'preview' | 'code';

@Component({
  selector: 'app-code-example',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <article class="example-card">
      <header class="example-header">
        <h2>{{ title() }}</h2>
        <p class="description">{{ description() }}</p>
      </header>

      <div class="example-content">
        <div class="tabs">
          <div class="tab-list">
            <button
              class="tab"
              [class.active]="activeTab() === 'preview'"
              (click)="setTab('preview')"
            >
              Preview
            </button>
            <button
              class="tab"
              [class.active]="activeTab() === 'code'"
              (click)="setTab('code')"
            >
              Code
            </button>
          </div>

          @if (activeTab() === 'code') {
            <button class="copy-btn" (click)="copyCode()">
              @if (copied()) {
                <span>✓ Copied</span>
              } @else {
                <span>Copy</span>
              }
            </button>
          }
        </div>

        <div class="tab-content">
          @if (activeTab() === 'preview') {
            <div class="preview-pane">
              <div class="preview-buttons">
                <button class="btn btn-primary">Primary Button</button>
                <button class="btn btn-secondary">Secondary</button>
                <button class="btn btn-primary btn-small">Small</button>
                <button class="btn btn-primary btn-large">Large Button</button>
              </div>
            </div>
          } @else {
            <div class="code-pane">
              <div class="editor-wrapper">
                <vertex-editor
                  [attr.value]="code()"
                  language="typescript"
                  [attr.theme]="theme()"
                  lineNumbers="true"
                  readonly="true"
                  height="350px"
                  fontSize="13"
                />
              </div>
            </div>
          }
        </div>
      </div>
    </article>
  `,
  styles: `
    :host {
      display: block;
    }

    .example-card {
      background: #111;
      border: 1px solid #222;
      border-radius: 16px;
      overflow: hidden;
    }

    .example-header {
      padding: 1.5rem 1.5rem 0;
    }

    h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #fff;
      margin: 0 0 0.5rem;
    }

    .description {
      font-size: 0.9375rem;
      color: #888;
      margin: 0;
      line-height: 1.5;
    }

    .example-content {
      padding: 1.5rem;
    }

    .tabs {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #1a1a2e;
      border-radius: 10px 10px 0 0;
      padding: 0.375rem;
    }

    .tab-list {
      display: flex;
      gap: 0.25rem;
    }

    .tab {
      padding: 0.5rem 1rem;
      background: transparent;
      border: none;
      border-radius: 8px;
      color: #888;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab:hover {
      color: #e5e5e5;
    }

    .tab.active {
      background: #2d2d3a;
      color: #a78bfa;
    }

    .copy-btn {
      padding: 0.375rem 0.875rem;
      background: transparent;
      border: 1px solid #3d3d4a;
      border-radius: 6px;
      color: #888;
      font-size: 0.8125rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .copy-btn:hover {
      border-color: #555;
      color: #e5e5e5;
    }

    .tab-content {
      background: #0a0a0f;
      border-radius: 0 0 10px 10px;
      min-height: 350px;
    }

    .preview-pane {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 350px;
      padding: 2rem;
    }

    .preview-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      justify-content: center;
    }

    .btn {
      padding: 0.625rem 1.25rem;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      font-family: inherit;
    }

    .btn-primary {
      background: #7c3aed;
      color: white;
    }

    .btn-primary:hover {
      background: #6d28d9;
    }

    .btn-secondary {
      background: #2d2d3a;
      color: #e5e5e5;
    }

    .btn-secondary:hover {
      background: #3d3d4a;
    }

    .btn-small {
      padding: 0.375rem 0.875rem;
      font-size: 0.875rem;
    }

    .btn-large {
      padding: 0.875rem 1.75rem;
      font-size: 1.0625rem;
    }

    .code-pane {
      height: 350px;
      overflow: hidden;
    }

    .editor-wrapper {
      height: 100%;
    }

    ::ng-deep vertex-editor {
      height: 100%;
      display: block;
      border-radius: 0 0 10px 10px;
      overflow: hidden;
    }

    ::ng-deep .cm-editor {
      height: 100% !important;
    }

    ::ng-deep .cm-scroller {
      font-family: "JetBrains Mono", monospace !important;
    }
  `,
})
export class CodeExampleComponent {
  title = input.required<string>();
  description = input.required<string>();
  code = input.required<string>();
  theme = input<'light' | 'dark'>('dark');

  readonly activeTab = signal<Tab>('preview');
  readonly copied = signal(false);

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  async copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.code());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
}
