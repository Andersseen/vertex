# Vertex Editor — API Reference

Two standalone web components are published from this package:

| Feature | `<vertex-editor>` | `<vertex-editor-lite>` |
|---|---|---|
| Purpose | Full code editing | Read-only code display |
| Bundle | ~1.1 MB minified | ~450 KB minified |
| Engine | Angular Elements + CodeMirror 6 | Native Web Component + CodeMirror 6 |
| Editing | Yes | No |
| Search | Yes | No |
| Autocomplete | Yes | No |
| Themes | dark / light | dark / light |

---

## Installation

```bash
# Full editable editor
npx vertex-editor ./public

# Read-only lite variant
npx vertex-editor ./public --lite

# Or with curl
curl -fsSL https://raw.githubusercontent.com/Andersseen/vertex/main/scripts/install.mjs | node - ./public --lite
```

Include the script once in your HTML:

```html
<!-- Full editor -->
<script src="web-editor.min.js"></script>

<!-- Lite variant -->
<script src="web-editor-lite.min.js"></script>
```

---

## `<vertex-editor>` API

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | `""` | Editor content |
| `language` | string | `"typescript"` | `typescript`, `javascript`, `html`, `css`, `json`, `markdown`, `rust`, `python` |
| `theme` | string | `"dark"` | `dark` or `light` |
| `line-numbers` | boolean | `true` | Show line numbers |
| `readonly` | boolean | `false` | Read-only mode |
| `word-wrap` | boolean | `false` | Enable word wrapping |
| `height` | string | `"100%"` | Editor container height |
| `font-size` | string | `"14"` | Font size in pixels |
| `tab-size` | number | `2` | Tab size |
| `placeholder` | string | `""` | Placeholder text |
| `enable-search` | boolean | `true` | Enable search keymap |
| `enable-autocomplete` | boolean | `true` | Enable autocomplete |

### Methods

```ts
getValue(): string
setValue(value: string): void
insertText(text: string): void
focus(): void
```

### Events

```ts
// Fired when the editor is initialized and ready
customEvent<void>('ready')

// Fired on every content change (only if not readonly)
customEvent<string>('valueChange')

// Fired when cursor/selection moves
customEvent<{ line: number; column: number }>('cursorActivity')
```

### Vanilla HTML example

```html
<vertex-editor
  value="const x: number = 1;"
  language="typescript"
  theme="dark"
  line-numbers="true"
  height="400px">
</vertex-editor>

<script>
  const editor = document.querySelector('vertex-editor');
  editor.addEventListener('ready', () => console.log('Editor ready'));
  editor.addEventListener('valueChange', (e) => console.log(e.detail));
</script>
```

---

## `<vertex-editor-lite>` API

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `value` | string | `""` | Code content |
| `language` | string | `"javascript"` | `javascript`, `typescript`, `html`, `css`, `json` |
| `theme` | string | `"dark"` | `dark` or `light` |
| `line-numbers` | boolean | `true` | Show line numbers |
| `height` | string | `"100%"` | Container height |
| `font-size` | string | `"14"` | Font size in pixels |

### Methods

```ts
getValue(): string
setValue(value: string): void
focus(): void
```

### Events

```ts
customEvent<void>('ready')
```

### Vanilla HTML example

```html
<vertex-editor-lite
  value="console.log('hello');"
  language="javascript"
  theme="dark"
  line-numbers="true"
  height="300px">
</vertex-editor-lite>
```

---

## Framework examples

### React

```tsx
import { useEffect, useRef } from 'react';
import './web-editor.min.js';

export function CodeEditor({ code, onChange }: { code: string; onChange?: (v: string) => void }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleValueChange = (e: Event) => {
      onChange?.((e as CustomEvent<string>).detail);
    };

    el.addEventListener('valueChange', handleValueChange);
    return () => el.removeEventListener('valueChange', handleValueChange);
  }, [onChange]);

  useEffect(() => {
    if (ref.current && ref.current.getValue() !== code) {
      ref.current.setValue(code);
    }
  }, [code]);

  return (
    <vertex-editor
      ref={ref}
      language="typescript"
      theme="dark"
      line-numbers="true"
      style={{ display: 'block', height: '400px' }}
    />
  );
}
```

### Vue 3

```vue
<template>
  <vertex-editor
    ref="editor"
    :value="code"
    language="typescript"
    theme="dark"
    line-numbers="true"
    style="display: block; height: 400px;"
    @valueChange="code = $event.detail"
  />
</template>

<script setup>
import { ref } from 'vue';
import './web-editor.min.js';

const code = ref(`const greeting = 'Hello Vue';`);
</script>
```

### Angular

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import './web-editor.min.js';

@Component({
  selector: 'app-code-editor',
  standalone: true,
  template: `
    <vertex-editor
      [attr.value]="code()"
      language="typescript"
      theme="dark"
      line-numbers="true"
      height="400px"
      (valueChange)="code.set($event.detail)">
    </vertex-editor>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CodeEditorComponent {
  code = signal(`const x = 1;`);
}
```

### Astro

```astro
---
const code = `const sum = (a: number, b: number) => a + b;`;
---

<script>
  import './web-editor.min.js';
</script>

<vertex-editor
  value={code}
  language="typescript"
  theme="dark"
  line-numbers="true"
  height="300px"
/>
```

---

## Styling

Both components expose CSS custom properties:

```css
vertex-editor,
vertex-editor-lite {
  --vertex-editor-font-size: 15px;
  --vertex-editor-line-height: 1.6;
  border-radius: 8px;
  border: 1px solid #333;
}
```

---

## TypeScript types

Install from the monorepo or GitHub and import types:

```ts
import type { EditorTheme, CursorPosition } from '@vertex/web-editor';
```

When consuming the IIFE bundle in plain HTML, the custom element is typed as a generic `HTMLElement` with the public methods above.
