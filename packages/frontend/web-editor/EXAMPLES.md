# Vertex Editor - Usage Examples

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [With Different Frameworks](#with-different-frameworks)
3. [Advanced Examples](#advanced-examples)

---

## Basic Usage

### Simple HTML Page

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/@vertex/web-editor/dist/web-editor.min.js"></script>
</head>
<body>
  <vertex-editor
    value="console.log('Hello!');"
    language="javascript"
    theme="dark"
    height="300px"
  ></vertex-editor>
</body>
</html>
```

### With Custom Styling

```html
<style>
  vertex-editor {
    --vertex-editor-font-size: 16px;
    border-radius: 12px;
    border: 2px solid #7c3aed;
  }
</style>

<vertex-editor
  value="// Your code here"
  language="typescript"
  theme="dark"
  height="400px"
></vertex-editor>
```

---

## With Different Frameworks

### React with Hooks

```jsx
import { useRef, useEffect, useState } from 'react';
import '@vertex/web-editor';

function CodePlayground() {
  const editorRef = useRef(null);
  const [output, setOutput] = useState('');

  const runCode = () => {
    const code = editorRef.current?.getValue();
    try {
      // Safe evaluation for demo purposes
      const result = new Function(code)();
      setOutput(String(result));
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    }
  };

  return (
    <div>
      <vertex-editor
        ref={editorRef}
        value="return 2 + 2;"
        language="javascript"
        theme="dark"
        height="300px"
      />
      <button onClick={runCode}>Run</button>
      <pre>{output}</pre>
    </div>
  );
}
```

### Vue 3 with Composition API

```vue
<script setup>
import { ref, onMounted } from 'vue';
import '@vertex/web-editor';

const editorRef = ref(null);
const themes = ['dark', 'light'];
const currentTheme = ref('dark');

const changeTheme = () => {
  currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark';
  editorRef.value?.setAttribute('theme', currentTheme.value);
};

onMounted(() => {
  editorRef.value?.addEventListener('ready', () => {
    console.log('Editor is ready!');
  });
});
</script>

<template>
  <div>
    <button @click="changeTheme">Toggle Theme</button>
    <vertex-editor
      ref="editorRef"
      value="const x = 1;"
      language="typescript"
      :theme="currentTheme"
    />
  </div>
</template>
```

### Svelte

```svelte
<script>
  import '@vertex/web-editor';
  
  let editor;
  let code = 'let count = 0;';
  
  function handleChange() {
    code = editor.getValue();
  }
</script>

<main>
  <vertex-editor
    bind:this={editor}
    value={code}
    language="javascript"
    theme="dark"
    height="300px"
  />
  <button on:click={handleChange}>Update</button>
  <pre>{code}</pre>
</main>
```

### Next.js

```jsx
// components/CodeEditor.js
import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';

const CodeEditor = ({ initialCode, onChange }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    import('@vertex/web-editor');
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && initialCode) {
      editor.setValue(initialCode);
    }
  }, [initialCode]);

  return (
    <vertex-editor
      ref={editorRef}
      language="typescript"
      theme="dark"
      height="400px"
      style={{ display: 'block' }}
    />
  );
};

export default dynamic(() => Promise.resolve(CodeEditor), { ssr: false });
```

### Astro Islands

```astro
---
// CodeBlock.astro
interface Props {
  code: string;
  language?: string;
}

const { code, language = 'typescript' } = Astro.props;
---

<div class="code-block">
  <vertex-editor
    value={code}
    language={language}
    theme="dark"
    readonly="true"
    lineNumbers="true"
    height="auto"
  />
</div>

<script>
  import '@vertex/web-editor';
</script>

<style>
  .code-block {
    border-radius: 8px;
    overflow: hidden;
    margin: 1rem 0;
  }
</style>
```

---

## Advanced Examples

### Code Diff Viewer

```html
<div class="diff-container">
  <div class="diff-column">
    <h3>Before</h3>
    <vertex-editor id="before" value="const x = 1;" readonly="true"></vertex-editor>
  </div>
  <div class="diff-column">
    <h3>After</h3>
    <vertex-editor id="after" value="const x = 2;" readonly="true"></vertex-editor>
  </div>
</div>

<style>
  .diff-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
</style>
```

### Collaborative Editor (with WebSocket)

```javascript
const editor = document.getElementById('editor');
const ws = new WebSocket('wss://your-server.com');

// Receive updates from other users
ws.onmessage = (event) => {
  const { userId, code } = JSON.parse(event.data);
  if (userId !== myUserId) {
    editor.setValue(code);
  }
};

// Send updates
let debounceTimer;
editor.addEventListener('value-change', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    ws.send(JSON.stringify({
      userId: myUserId,
      code: editor.getValue()
    }));
  }, 300);
});
```

### Code Formatter Integration

```html
<div class="editor-container">
  <div class="toolbar">
    <button onclick="formatCode()">Format (Prettier)</button>
  </div>
  <vertex-editor id="formatter-editor" language="typescript"></vertex-editor>
</div>

<script type="module">
  import prettier from 'https://esm.sh/prettier@3';
  import parserTypescript from 'https://esm.sh/prettier@3/parser-typescript';

  async function formatCode() {
    const editor = document.getElementById('formatter-editor');
    const code = editor.getValue();
    
    try {
      const formatted = await prettier.format(code, {
        parser: 'typescript',
        plugins: [parserTypescript],
        singleQuote: true,
        tabWidth: 2
      });
      editor.setValue(formatted);
    } catch (err) {
      console.error('Format error:', err);
    }
  }

  window.formatCode = formatCode;
</script>
```

### Syntax Highlighter for Static Sites

```html
<!-- For blog posts or documentation -->
<article>
  <h2>Example Code</h2>
  <vertex-editor
    value="function greet(name) {
  return \`Hello, \${name}!\`;
}"
    language="javascript"
    theme="dark"
    readonly="true"
    lineNumbers="true"
    height="auto"
  ></vertex-editor>
</article>

<style>
  /* Make it look like a code block, not an editor */
  article vertex-editor::part(editor) {
    background: transparent;
  }
</style>
```

---

## Tips & Best Practices

### Performance

```javascript
// Debounce value changes
let timeout;
editor.addEventListener('value-change', () => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    saveToDatabase(editor.getValue());
  }, 500);
});
```

### Accessibility

```html
<label for="code-editor">Source Code:</label>
<vertex-editor
  id="code-editor"
  value=""
  language="typescript"
  aria-label="Code editor"
></vertex-editor>
```

### Error Handling

```javascript
const editor = document.getElementById('editor');

editor.addEventListener('ready', () => {
  try {
    const code = editor.getValue();
    // Do something with code
  } catch (err) {
    console.error('Editor error:', err);
  }
});

// Fallback if editor fails to load
setTimeout(() => {
  if (!editor.isInitialized) {
    console.warn('Editor failed to initialize');
  }
}, 5000);
```
