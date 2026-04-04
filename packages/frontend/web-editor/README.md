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
- 🎯 **Zoneless Angular** - Uses signals, no zone.js overhead

## Quick Installation

### Option 1: npx (Easiest - No install needed)

```bash
# Install directly from GitHub to your project
npx github:your-username/vertex/packages/frontend/web-editor/bin/install.mjs ./public

# Or specify a different directory
npx github:your-username/vertex/packages/frontend/web-editor/bin/install.mjs ./static
```

### Option 2: Local Server (For development)

```bash
# Terminal 1: Start server from vertex monorepo
cd packages/frontend/web-editor
node bin/serve-worker.mjs 8080

# Terminal 2: Download to your project
curl http://localhost:8080/web-editor.min.js -o ./public/web-editor.min.js
```

### Option 3: Manual Download

```bash
# Download directly from GitHub raw
curl -L https://raw.githubusercontent.com/your-username/vertex/main/packages/frontend/web-editor/dist/web-editor.min.js \
  -o ./public/web-editor.min.js
```

### Option 4: npm (Coming Soon)

```bash
npm install @vertex/web-editor
```

## Quick Start

After installation, include the script in your HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="web-editor.min.js"></script>
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

## Framework Examples

### React

```jsx
import { useEffect, useRef } from 'react';
import './web-editor.min.js';

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
import './web-editor.min.js';

const props = defineProps({
  code: String
});

const editor = ref(null);

onMounted(() => {
  console.log(editor.value.getValue());
});
</script>
```

### Angular

```typescript
import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import './web-editor.min.js';

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
  import './web-editor.min.js';
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

## CLI Options

See [CLI.md](./CLI.md) for detailed CLI documentation.

```bash
# Install from GitHub (default)
npx github:your-username/vertex/packages/frontend/web-editor/bin/install.mjs ./public

# Use local monorepo build
node bin/install.mjs ./public --local

# Use custom URL
node bin/install.mjs ./public --url=https://your-cdn.com/web-editor.min.js

# Start local server
node bin/serve-worker.mjs 8080
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

## Development

```bash
# Clone the repo
git clone https://github.com/your-username/vertex.git
cd vertex/packages/frontend/web-editor

# Install dependencies
npm install

# Build
npm run build

# Start dev server
node bin/serve-worker.mjs
```

## More Examples

See [EXAMPLES.md](./EXAMPLES.md) for more detailed examples including:
- Code display with copy button
- Interactive playground
- Documentation with tabs
- Code diff viewer
- Collaborative editor

## License

MIT
