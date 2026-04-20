import { Component, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { CodeExampleComponent } from "./components/code-example/code-example.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, CodeExampleComponent],
  template: `
    <div class="app-container">
      <header class="header">
        <div class="header-content">
          <h1>Vertex Editor</h1>
          <p class="subtitle">
            A lightweight, standalone code editor Web Component built with
            Angular Elements and CodeMirror 6
          </p>
        </div>
        <div class="theme-toggle">
          <span class="theme-label">Theme:</span>
          <button
            class="toggle-btn"
            [class.active]="theme() === 'light'"
            (click)="setTheme('light')"
          >Light</button>
          <button
            class="toggle-btn"
            [class.active]="theme() === 'dark'"
            (click)="setTheme('dark')"
          >Dark</button>
        </div>
      </header>

      <main class="main">
        <app-code-example
          title="Button Component"
          description="A versatile button component with multiple variants and sizes."
          [code]="buttonCode"
          [theme]="theme()"
        />
      </main>

      <footer class="footer">
        <p>Built with using Angular and CodeMirror 6</p>
      </footer>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: #0a0a0a;
      color: #e5e5e5;
      font-family:
        "Inter",
        -apple-system,
        BlinkMacSystemFont,
        sans-serif;
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

    .theme-toggle {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1.5rem;
    }

    .theme-label {
      font-size: 0.875rem;
      color: #888;
    }

    .toggle-btn {
      padding: 0.375rem 1rem;
      border-radius: 6px;
      border: 1px solid #333;
      background: transparent;
      color: #888;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .toggle-btn.active {
      background: #7c3aed;
      border-color: #7c3aed;
      color: #fff;
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
  `,
})
export class AppComponent {
  readonly theme = signal<'light' | 'dark'>('dark');

  setTheme(t: 'light' | 'dark'): void {
    this.theme.set(t);
  }

  // Button component source code as a string
  readonly buttonCode = [
    "import { Component, input, output } from '@angular/core';",
    "",
    "@Component({",
    "  selector: 'app-button',",
    "  standalone: true,",
    "  template: `",
    "    <button",
    "      [class.primary]=\"variant() === 'primary'\"",
    "      [class.secondary]=\"variant() === 'secondary'\"",
    "      [class.small]=\"size() === 'small'\"",
    "      [class.large]=\"size() === 'large'\"",
    '      (click)="onClick.emit($event)"',
    "    >",
    "      <ng-content></ng-content>",
    "    </button>",
    "  `,",
    "  styles: `",
    "    button {",
    "      padding: 0.75rem 1.5rem;",
    "      border-radius: 8px;",
    "      font-weight: 500;",
    "      cursor: pointer;",
    "      transition: all 0.2s;",
    "      border: none;",
    "    }",
    "",
    "    button.primary {",
    "      background: #667eea;",
    "      color: white;",
    "    }",
    "",
    "    button.primary:hover {",
    "      background: #5a6fd6;",
    "    }",
    "",
    "    button.secondary {",
    "      background: #2d2d3a;",
    "      color: #e5e5e5;",
    "    }",
    "",
    "    button.small {",
    "      padding: 0.5rem 1rem;",
    "      font-size: 0.875rem;",
    "    }",
    "",
    "    button.large {",
    "      padding: 1rem 2rem;",
    "      font-size: 1.125rem;",
    "    }",
    "  `",
    "})",
    "export class ButtonComponent {",
    "  variant = input<'primary' | 'secondary'>('primary');",
    "  size = input<'small' | 'medium' | 'large'>('medium');",
    "  onClick = output<Event>();",
    "}",
  ].join("\n");
}
