# Vertex Editor

A lightweight, standalone code editor Web Component built with Angular Elements and CodeMirror 6.

## Features

- 🚀 **Zero dependencies** - Single JS file, no build step required
- 📦 **Web Component** - Works with any framework or vanilla JS
- 🎨 **Multiple themes** - Dark and light modes
- 🔤 **Language support** - TypeScript, JavaScript, HTML, CSS, JSON, Markdown
- 📱 **Responsive** - Adapts to container size
- ⚡ **Lazy loading** - Languages load on demand
- 🔧 **Customizable** - Line numbers, read-only mode, word wrap, and more

## Installation

### Option 1: CDN (Recommended)

```html
<script src="https://cdn.jsdelivr.net/npm/@vertex/web-editor/dist/web-editor.min.js"></script>
```

### Option 2: NPM

```bash
npm install @vertex/web-editor
```

Then import in your project:

```javascript
import '@vertex/web-editor';
```

Or include the script:

```html
<script src="./node_modules/@vertex/web-editor/dist/web-editor.min.js"></script>
```

### Option 3: CLI Installer

```bash
npx @vertex/web-editor install
```

## Quick Start

### Vanilla HTML/JS

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/@vertex/web-editor/dist/web-editor.min.js"></script>
</head>
<body>
  <vertex-editor
    value="console.log('Hello World!');"
    language="javascript"
    theme="dark"
    height="300px"
  ></vertex-editor>
</body>
</html>
```

### React

```jsx
import { useEffect, useRef } from 'react';
import '@vertex/web-editor';

function CodeEditor({ code, language = 'typescript' }) {
  const editorRef = useRef(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      editor.setValue(code);
    }
  }, [code]);

  return (
    <vertex-editor
      ref={editorRef}
      language={language}
      theme="dark"
      lineNumbers="true"
      height="400px"
      style={{ display: 'block' }}
    />
  );
}

export default CodeEditor;
```

### Vue 3

```vue
<template>
  <vertex-editor
    ref="editor"
    :value="code"
    language="typescript"
    theme="dark"
    lineNumbers="true"
    height="400px"
  />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import '@vertex/web-editor';

const props = defineProps({
  code: String
});

const editor = ref(null);

onMounted(() => {
  // Access editor methods
  console.log(editor.value.getValue());
});
</script>
```

### Angular

```typescript
import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@vertex/web-editor';

@Component({
  selector: 'app-code-display',
  standalone: true,
  template: `
    <vertex-editor
      #editor
      [attr.value]="code"
      language="typescript"
      theme="dark"
      lineNumbers="true"
      readonly="true"
      height="400px"
    />
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CodeDisplayComponent implements AfterViewInit {
  @ViewChild('editor') editorRef!: ElementRef;
  code = `const greeting = 'Hello World!';`;

  ngAfterViewInit() {
    // Editor is ready
    const editor = this.editorRef.nativeElement;
    console.log('Editor value:', editor.getValue());
  }
}
```

### Astro

```astro
---
const code = `const sum = (a, b) => a + b;`;
---

<script>
  import '@vertex/web-editor';
</script>

<vertex-editor
  value={code}
  language="javascript"
  theme="dark"
  lineNumbers="true"
  height="300px"
/>
```

## API Reference

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | string | `""` | Editor content |
| `language` | string | `"typescript"` | Language mode (javascript, typescript, html, css, json, markdown) |
| `theme` | string | `"dark"` | Editor theme (`dark` or `light`) |
| `lineNumbers` | boolean | `true` | Show line numbers |
| `readonly` | boolean | `false` | Read-only mode |
| `wordWrap` | boolean | `false` | Enable word wrapping |
| `height` | string | `"300px"` | Editor height |
| `fontSize` | string | `"14"` | Font size in pixels |
| `tabSize` | number | `2` | Tab size |
| `placeholder` | string | `""` | Placeholder text |

### Methods

| Method | Description |
|--------|-------------|
| `getValue()` | Returns the current editor content |
| `setValue(value: string)` | Sets the editor content |
| `insertText(text: string)` | Inserts text at cursor position |
| `focus()` | Focuses the editor |

### Events

| Event | Description |
|-------|-------------|
| `ready` | Fired when the editor is initialized and ready |

## Examples

### Code Display with Copy Button

```html
<div class="code-block">
  <div class="code-header">
    <span>example.ts</span>
    <button onclick="copyCode()">Copy</button>
  </div>
  <vertex-editor
    id="code-editor"
    value="const greeting = 'Hello';"
    language="typescript"
    theme="dark"
    readonly="true"
    lineNumbers="true"
    height="200px"
  ></vertex-editor>
</div>

<script>
  function copyCode() {
    const editor = document.getElementById('code-editor');
    navigator.clipboard.writeText(editor.getValue());
  }
</script>

<style>
  .code-block {
    border: 1px solid #333;
    border-radius: 8px;
    overflow: hidden;
  }
  .code-header {
    display: flex;
    justify-content: space-between;
    padding: 8px 16px;
    background: #1a1a1a;
    color: #888;
    font-size: 14px;
  }
  .code-header button {
    background: transparent;
    border: 1px solid #444;
    color: #888;
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
  }
</style>
```

### Interactive Playground

```html
<div class="playground">
  <div class="toolbar">
    <select id="language">
      <option value="javascript">JavaScript</option>
      <option value="typescript">TypeScript</option>
      <option value="html">HTML</option>
      <option value="css">CSS</option>
    </select>
    <button onclick="runCode()">Run</button>
  </div>
  <vertex-editor
    id="playground-editor"
    value="console.log('Hello!');"
    language="javascript"
    theme="dark"
    height="300px"
  ></vertex-editor>
  <div id="output"></div>
</div>

<script>
  const editor = document.getElementById('playground-editor');
  const languageSelect = document.getElementById('language');
  
  languageSelect.addEventListener('change', (e) => {
    editor.setAttribute('language', e.target.value);
  });

  function runCode() {
    const code = editor.getValue();
    console.log('Running:', code);
    // Execute or evaluate code here
  }
</script>
```

### Documentation with Tabs

```html
<div class="doc-example">
  <div class="tabs">
    <button class="tab active" onclick="showTab('preview')">Preview</button>
    <button class="tab" onclick="showTab('code')">Code</button>
  </div>
  
  <div id="preview-panel" class="panel active">
    <!-- Preview content -->
  </div>
  
  <div id="code-panel" class="panel">
    <vertex-editor
      value="<!-- Your HTML here -->"
      language="html"
      theme="dark"
      readonly="true"
      height="300px"
    ></vertex-editor>
  </div>
</div>

<script>
  function showTab(tab) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(tab + '-panel').classList.add('active');
  }
</script>
```

## Styling

The editor exposes CSS custom properties for customization:

```css
vertex-editor {
  --vertex-editor-font-size: 16px;
  --vertex-editor-line-height: 1.6;
  border-radius: 8px;
  border: 1px solid #333;
}

/* Dark theme (default) */
vertex-editor[theme="dark"] {
  border-color: #444;
}

/* Light theme */
vertex-editor[theme="light"] {
  border-color: #ddd;
}
```

## Browser Support

- Chrome/Edge 80+
- Firefox 75+
- Safari 13.1+

## License

MIT
