# Using Vertex Editor in Angular

## Installation

```bash
# Install the web component
curl -fsSL https://raw.githubusercontent.com/andersseen/vertex/main/scripts/install.mjs | node - ./public
```

Then add the script to your `angular.json`:

```json
{
  "projects": {
    "your-app": {
      "architect": {
        "build": {
          "options": {
            "scripts": [
              "src/web-editor.min.js"
            ]
          }
        }
      }
    }
  }
}
```

Or import it in your `main.ts`:

```typescript
import './web-editor.min.js';
```

## Component Usage

```typescript
import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  signal,
  viewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-code-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // <-- Important!
  template: `
    <div class="code-container">
      <vertex-editor
        #editor
        [attr.value]="code()"
        [attr.language]="language()"
        theme="dark"
        lineNumbers="true"
        readonly="true"
        height="400px"
      ></vertex-editor>
    </div>
  `,
  styles: `
    .code-container {
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #333;
    }
    
    vertex-editor {
      display: block;
    }
  `
})
export class CodePanel implements AfterViewInit {
  readonly code = input.required<string>();
  readonly language = input<string>('typescript');
  
  private editorRef = viewChild<ElementRef>('editor');

  ngAfterViewInit() {
    // Access editor methods after it's ready
    const editor = this.editorRef()?.nativeElement;
    if (editor) {
      editor.addEventListener('ready', () => {
        console.log('Editor ready, value:', editor.getValue());
      });
    }
  }
  
  // Example: Copy code
  async copyCode() {
    const editor = this.editorRef()?.nativeElement;
    if (editor) {
      const code = editor.getValue();
      await navigator.clipboard.writeText(code);
    }
  }
}
```

## Key Points

1. **`schemas: [CUSTOM_ELEMENTS_SCHEMA]`** - Required to use custom elements
2. **`[attr.value]="code()"`** - Bind value as attribute (not property)
3. **Access methods via `nativeElement`** - After `ready` event
4. **Import the script** - Either in `angular.json` or `main.ts`

## Your Fixed Component

```typescript
import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  signal,
  viewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopyButton } from './copy-button';

@Component({
  selector: 'app-code-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CopyButton],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // <-- Fixed: moved to schemas
  template: `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-lg">{{ title() }}</h3>
        <app-copy-button [code]="code()" />
      </div>

      @if (cliCommand()) {
        <div class="cli-command">
          <span>Install via CLI:</span>
          <code>{{ cliCommand() }}</code>
          <button (click)="copyCliCommand()">
            {{ cliCopied() ? 'Copied!' : 'Copy' }}
          </button>
        </div>
      }

      <div class="editor-wrapper">
        <vertex-editor
          [attr.value]="code()"
          [attr.language]="'typescript'"
          theme="dark"
          lineNumbers="true"
          readonly="true"
          height="400px"
        ></vertex-editor>
      </div>

      @if (description()) {
        <p class="description">{{ description() }}</p>
      }
    </div>
  `,
  styles: `
    .editor-wrapper {
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #333;
    }
    
    vertex-editor {
      display: block;
    }
  `
})
export class CodePanel {
  readonly title = input<string>('Component Source');
  readonly code = input.required<string>();
  readonly cliCommand = input<string>('');
  readonly description = input<string>('');

  cliCopied = signal(false);

  async copyCliCommand() {
    if (!this.cliCommand()) return;
    try {
      await navigator.clipboard.writeText(this.cliCommand());
      this.cliCopied.set(true);
      setTimeout(() => this.cliCopied.set(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
}
```
