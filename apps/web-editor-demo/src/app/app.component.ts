import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CodeExampleComponent } from './components/code-example/code-example.component';

interface Example {
  id: string;
  title: string;
  description: string;
  language: 'typescript' | 'html' | 'css' | 'json';
  code: string;
  previewType: 'button' | 'card' | 'input' | 'dropdown';
}

@Component({
  selector: 'demo-root',
  standalone: true,
  imports: [CommonModule, CodeExampleComponent],
  template: `
    <div class="app-container">
      <header class="header">
        <div class="header-content">
          <h1>🚀 Vertex Editor</h1>
          <p class="subtitle">
            A lightweight, standalone code editor Web Component built with Angular Elements and CodeMirror 6
          </p>
        </div>
      </header>

      <main class="main">
        @for (example of examples(); track example.id) {
          <demo-code-example
            [title]="example.title"
            [description]="example.description"
            [language]="example.language"
            [code]="example.code"
            [previewType]="example.previewType"
          />
        }
      </main>

      <footer class="footer">
        <p>Built with ❤️ using Angular and CodeMirror 6</p>
      </footer>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: #0a0a0a;
      color: #e5e5e5;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .header {
      padding: 4rem 2rem 3rem;
      background: linear-gradient(180deg, #111 0%, #0a0a0a 100%);
      border-bottom: 1px solid #222;
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      font-size: 3rem;
      font-weight: 700;
      margin: 0 0 1rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      font-size: 1.125rem;
      color: #888;
      max-width: 600px;
      margin: 0;
      line-height: 1.6;
    }

    .main {
      flex: 1;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding: 3rem 2rem;
      display: flex;
      flex-direction: column;
      gap: 3rem;
    }

    .footer {
      padding: 2rem;
      text-align: center;
      border-top: 1px solid #222;
      color: #666;
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .header {
        padding: 2rem 1rem;
      }

      h1 {
        font-size: 2rem;
      }

      .subtitle {
        font-size: 1rem;
      }

      .main {
        padding: 2rem 1rem;
      }
    }
  `
})
export class AppComponent {
  readonly examples = signal<Example[]>([
    {
      id: 'button',
      title: 'Button Component',
      description: 'A versatile button component with multiple variants and sizes.',
      language: 'typescript',
      code: `import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  template: \`
    <button
      [class.primary]="variant() === 'primary'"
      [class.secondary]="variant() === 'secondary'"
      [class.small]="size() === 'small'"
      [class.large]="size() === 'large'"
      (click)="onClick.emit($event)"
    >
      <ng-content></ng-content>
    </button>
  \`,
  styles: \`
    button {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    button.primary {
      background: #667eea;
      color: white;
    }

    button.primary:hover {
      background: #5a6fd6;
    }

    button.secondary {
      background: #2d2d3a;
      color: #e5e5e5;
    }

    button.small {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
    }

    button.large {
      padding: 1rem 2rem;
      font-size: 1.125rem;
    }
  \`
})
export class ButtonComponent {
  variant = input<'primary' | 'secondary'>('primary');
  size = input<'small' | 'medium' | 'large'>('medium');
  onClick = output<Event>();
}`,
      previewType: 'button'
    },
    {
      id: 'card',
      title: 'Card Component',
      description: 'A card component with header, content, and footer sections.',
      language: 'typescript',
      code: `import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="card">
      @if (title()) {
        <div class="card-header">
          <h3>{{ title() }}</h3>
        </div>
      }
      <div class="card-content">
        <ng-content></ng-content>
      </div>
      @if (footer()) {
        <div class="card-footer">
          {{ footer() }}
        </div>
      }
    </div>
  \`,
  styles: \`
    .card {
      background: #1a1a2e;
      border-radius: 12px;
      border: 1px solid #2d2d3a;
      overflow: hidden;
    }

    .card-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #2d2d3a;
    }

    .card-header h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: #e5e5e5;
    }

    .card-content {
      padding: 1.5rem;
    }

    .card-footer {
      padding: 1rem 1.5rem;
      background: #16162a;
      border-top: 1px solid #2d2d3a;
      font-size: 0.875rem;
      color: #888;
    }
  \`
})
export class CardComponent {
  title = input<string>('');
  footer = input<string>('');
}`,
      previewType: 'card'
    },
    {
      id: 'dropdown',
      title: 'Menu Dropdown',
      description: 'Classic dropdown menu with keyboard navigation support.',
      language: 'typescript',
      code: `import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="dropdown-container">
      <button
        class="dropdown-trigger"
        (click)="isOpen.set(!isOpen())"
      >
        Open menu
        <span class="arrow" [class.open]="isOpen()">▼</span>
      </button>

      @if (isOpen()) {
        <div class="dropdown-menu">
          <button class="dropdown-item" (click)="select('edit')">
            Edit
          </button>
          <button class="dropdown-item" (click)="select('duplicate')">
            Duplicate
          </button>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item danger" (click)="select('delete')">
            Delete
          </button>
        </div>
      }
    </div>
  \`,
  styles: \`
    .dropdown-container {
      position: relative;
      display: inline-block;
    }

    .dropdown-trigger {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      background: #7c3aed;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
    }

    .arrow {
      font-size: 0.625rem;
      transition: transform 0.2s;
    }

    .arrow.open {
      transform: rotate(180deg);
    }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 0.5rem;
      background: #1a1a2e;
      border: 1px solid #2d2d3a;
      border-radius: 8px;
      min-width: 160px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.4);
      z-index: 100;
    }

    .dropdown-item {
      width: 100%;
      padding: 0.625rem 1rem;
      text-align: left;
      background: none;
      border: none;
      color: #e5e5e5;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .dropdown-item:hover {
      background: #2d2d3a;
    }

    .dropdown-item.danger {
      color: #ef4444;
    }

    .dropdown-divider {
      height: 1px;
      background: #2d2d3a;
      margin: 0.5rem 0;
    }
  \`
})
export class DropdownComponent {
  isOpen = signal(false);

  select(action: string) {
    console.log('Selected:', action);
    this.isOpen.set(false);
  }
}`,
      previewType: 'dropdown'
    },
    {
      id: 'input',
      title: 'Input Component',
      description: 'Form input with validation states and error handling.',
      language: 'typescript',
      code: `import { Component, input, model } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="input-wrapper">
      @if (label()) {
        <label>{{ label() }}</label>
      }
      <input
        [type]="type()"
        [placeholder]="placeholder()"
        [(ngModel)]="value"
        [class.error]="error()"
      />
      @if (error()) {
        <span class="error-message">{{ error() }}</span>
      }
    </div>
  \`,
  styles: \`
    .input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #a1a1aa;
    }

    input {
      padding: 0.625rem 0.875rem;
      background: #1a1a2e;
      border: 1px solid #2d2d3a;
      border-radius: 8px;
      color: #e5e5e5;
      font-size: 0.9375rem;
      outline: none;
      transition: border-color 0.2s;
    }

    input:focus {
      border-color: #7c3aed;
    }

    input.error {
      border-color: #ef4444;
    }

    .error-message {
      font-size: 0.8125rem;
      color: #ef4444;
    }
  \`
})
export class InputComponent {
  label = input<string>('');
  type = input<string>('text');
  placeholder = input<string>('');
  error = input<string>('');
  value = model<string>('');
}`,
      previewType: 'input'
    }
  ]);
}
