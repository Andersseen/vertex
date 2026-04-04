import {
  Component,
  input,
  signal,
  effect,
  viewChild,
  ElementRef,
  CUSTOM_ELEMENTS_SCHEMA,
} from "@angular/core";
import { CommonModule } from "@angular/common";

type Tab = "preview" | "code";
type PreviewType = "button" | "card" | "input" | "dropdown";

@Component({
  selector: "demo-code-example",
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
        <!-- Tabs -->
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

          @if (activeTab() === "code") {
            <button class="copy-btn" (click)="copyCode()">
              @if (copied()) {
                <span>✓ Copied</span>
              } @else {
                <span>Copy</span>
              }
            </button>
          }
        </div>

        <!-- Content -->
        <div class="tab-content">
          @if (activeTab() === "preview") {
            <div class="preview-pane">
              @switch (previewType()) {
                @case ("button") {
                  <div class="preview-buttons">
                    <button class="btn btn-primary">Primary Button</button>
                    <button class="btn btn-secondary">Secondary</button>
                    <button class="btn btn-primary btn-small">Small</button>
                    <button class="btn btn-primary btn-large">
                      Large Button
                    </button>
                  </div>
                }
                @case ("card") {
                  <div class="preview-card">
                    <div class="card">
                      <div class="card-header">
                        <h3>Card Title</h3>
                      </div>
                      <div class="card-content">
                        <p>
                          This is the card content area. You can put any content
                          here.
                        </p>
                      </div>
                      <div class="card-footer">Card Footer</div>
                    </div>
                  </div>
                }
                @case ("dropdown") {
                  <div class="preview-dropdown">
                    <div class="dropdown-container">
                      <button
                        class="dropdown-trigger"
                        (click)="toggleDropdown()"
                      >
                        Open menu
                        <span class="arrow" [class.open]="dropdownOpen()"
                          >▼</span
                        >
                      </button>
                      @if (dropdownOpen()) {
                        <div class="dropdown-menu">
                          <button
                            class="dropdown-item"
                            (click)="dropdownOpen.set(false)"
                          >
                            Edit
                          </button>
                          <button
                            class="dropdown-item"
                            (click)="dropdownOpen.set(false)"
                          >
                            Duplicate
                          </button>
                          <div class="dropdown-divider"></div>
                          <button
                            class="dropdown-item danger"
                            (click)="dropdownOpen.set(false)"
                          >
                            Delete
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                }
                @case ("input") {
                  <div class="preview-inputs">
                    <div class="input-wrapper">
                      <label>Email</label>
                      <input type="email" placeholder="Enter your email" />
                    </div>
                    <div class="input-wrapper">
                      <label>Password</label>
                      <input
                        type="password"
                        placeholder="Enter password"
                        class="error"
                      />
                      <span class="error-message">Password is required</span>
                    </div>
                  </div>
                }
              }
            </div>
          } @else {
            <div class="code-pane">
              <web-editor
                #editor
                [language]="language()"
                [value]="code()"
                theme="dark"
                [lineNumbers]="true"
                [readonly]="false"
                height="350px"
                fontSize="13"
              />
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

    /* Tabs */
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

    /* Tab Content */
    .tab-content {
      background: #0a0a0f;
      border-radius: 0 0 10px 10px;
      min-height: 350px;
    }

    /* Preview Pane */
    .preview-pane {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 350px;
      padding: 2rem;
    }

    /* Button Preview */
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

    /* Card Preview */
    .preview-card {
      width: 100%;
      max-width: 400px;
    }

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
      font-size: 1.0625rem;
      font-weight: 600;
      color: #e5e5e5;
    }

    .card-content {
      padding: 1.5rem;
      color: #a1a1aa;
      font-size: 0.9375rem;
    }

    .card-footer {
      padding: 1rem 1.5rem;
      background: #16162a;
      border-top: 1px solid #2d2d3a;
      font-size: 0.8125rem;
      color: #71717a;
    }

    /* Dropdown Preview */
    .preview-dropdown {
      position: relative;
    }

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
      font-family: inherit;
      font-size: 0.9375rem;
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
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
      z-index: 100;
      overflow: hidden;
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
      font-family: inherit;
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

    /* Input Preview */
    .preview-inputs {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      width: 100%;
      max-width: 320px;
    }

    .input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .input-wrapper label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #a1a1aa;
    }

    .input-wrapper input {
      padding: 0.625rem 0.875rem;
      background: #1a1a2e;
      border: 1px solid #2d2d3a;
      border-radius: 8px;
      color: #e5e5e5;
      font-size: 0.9375rem;
      outline: none;
      transition: border-color 0.2s;
      font-family: inherit;
    }

    .input-wrapper input:focus {
      border-color: #7c3aed;
    }

    .input-wrapper input.error {
      border-color: #ef4444;
    }

    .error-message {
      font-size: 0.8125rem;
      color: #ef4444;
    }

    /* Code Pane */
    .code-pane {
      height: 350px;
      overflow: hidden;
    }

    /* Web Editor Custom Styles */
    ::ng-deep web-editor {
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
  language = input.required<string>();
  code = input.required<string>();
  previewType = input.required<PreviewType>();

  readonly activeTab = signal<Tab>("preview");
  readonly copied = signal(false);
  readonly dropdownOpen = signal(false);

  private editorRef = viewChild<ElementRef>("editor");

  setTab(tab: Tab) {
    this.activeTab.set(tab);
  }

  toggleDropdown() {
    this.dropdownOpen.update((v) => !v);
  }

  async copyCode() {
    try {
      await navigator.clipboard.writeText(this.code());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }
}
