# @vertex/web-editor

A lightweight, standalone code editor Web Component built with Angular Elements and CodeMirror 6.

## Features

- 🚀 **Framework-agnostic** - Use with any framework or vanilla HTML/JS
- 📝 **CodeMirror 6** - Modern, high-performance editor
- 🎨 **Theming** - Light and dark themes built-in
- 🔤 **Multiple languages** - TypeScript, JavaScript, TSX, JSX, HTML, CSS, JSON, Markdown
- 📦 **Zero dependencies** - Single bundled file, no external dependencies needed
- 🔧 **Configurable** - Extensive customization options
- 💡 **Smart editing** - Autocompletion, syntax highlighting, bracket matching
- ⌨️ **Keyboard shortcuts** - Full keymap support

## Installation

### Via CDN (Recommended for quick start)

```html
<script src="https://unpkg.com/@vertex/web-editor@latest/dist/web-editor.min.js"></script>
```

### Via npm

```bash
npm install @vertex/web-editor
```

```javascript
import '@vertex/web-editor';
```

## Usage

### HTML

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/@vertex/web-editor@latest/dist/web-editor.min.js"></script>
</head>
<body>
  <web-editor
    language="typescript"
    theme="dark"
    value="console.log('Hello World!')"
    height="400px"
    line-numbers="true">
  </web-editor>
</body>
</html>
```

### JavaScript API

```javascript
const editor = document.querySelector('web-editor');

// Get value
const code = editor.getValue();

// Set value
editor.setValue('const x = 42;');

// Insert text at cursor
editor.insertText('// comment');

// Focus editor
editor.focus();
```

### React

```jsx
import '@vertex/web-editor';
import { useRef, useEffect } from 'react';

function CodeEditor() {
  const editorRef = useRef(null);
  
  useEffect(() => {
    const editor = editorRef.current;
    editor.addEventListener('value-change', (e) => {
      console.log('Code:', e.detail.value);
    });
  }, []);

  return (
    <web-editor
      ref={editorRef}
      language="typescript"
      theme="dark"
      value="const x = 1;"
    />
  );
}
```

### Vue

```vue
<template>
  <web-editor
    ref="editor"
    language="typescript"
    theme="dark"
    @value-change="onChange"
  />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import '@vertex/web-editor';

const editor = ref(null);

const onChange = (e) => {
  console.log('Code:', e.detail.value);
};
</script>
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `language` | `string` | `'typescript'` | Programming language (ts, js, tsx, jsx, html, css, json, markdown) |
| `theme` | `'light' \| 'dark'` | `'dark'` | Editor color theme |
| `value` | `string` | `''` | Initial editor content |
| `readonly` | `boolean` | `false` | Make editor read-only |
| `line-numbers` | `boolean` | `true` | Show line numbers |
| `height` | `string` | `'300px'` | Editor height (CSS value) |
| `font-size` | `string` | `'14'` | Font size in pixels |
| `placeholder` | `string` | `''` | Placeholder text |
| `tab-size` | `number` | `2` | Number of spaces per tab |
| `word-wrap` | `boolean` | `false` | Enable word wrapping |

## Events

| Event | Description | Detail |
|-------|-------------|--------|
| `value-change` | Content changed | `{ value: string }` |
| `focus` | Editor focused | - |
| `blur` | Editor lost focus | - |
| `ready` | Editor initialized | - |
| `cursor-activity` | Cursor moved | `{ line: number, column: number }` |

## Methods

| Method | Description |
|--------|-------------|
| `getValue(): string` | Get current editor content |
| `setValue(value: string)` | Set editor content |
| `insertText(text: string)` | Insert text at cursor position |
| `focus()` | Focus the editor |
| `format()` | Format code (if available) |

## Supported Languages

- `typescript` / `ts`
- `javascript` / `js`
- `tsx`
- `jsx`
- `html`
- `angular` (HTML templates)
- `astro` (treated as HTML)
- `css`
- `json`
- `markdown` / `md`

## CSS Customization

```css
web-editor {
  --web-editor-font-size: 16px;
  --web-editor-line-height: 1.6;
  --web-editor-border-radius: 12px;
  border-radius: var(--web-editor-border-radius);
}

/* Dark theme variables */
web-editor[theme="dark"] {
  --editor-bg: #1e1e1e;
  --editor-fg: #d4d4d4;
}

/* Light theme variables */
web-editor[theme="light"] {
  --editor-bg: #ffffff;
  --editor-fg: #2c2c2c;
}
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

## Development

```bash
# Install dependencies
bun install

# Build for development
bun run build:dev

# Build for production
bun run build

# Watch mode
bun run watch
```

## License

MIT © Andrii Pap
