#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CDN_URL = 'https://cdn.jsdelivr.net/npm/@vertex/web-editor@latest/dist/web-editor.min.js';
const FALLBACK_LOCAL = path.join(__dirname, '..', 'dist', 'web-editor.min.js');

const args = process.argv.slice(2);
const targetDir = args[0] || './public';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      } else {
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function copyLocalFile(src, dest) {
  return new Promise((resolve, reject) => {
    fs.copyFile(src, dest, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function createExample(dir, filename, content) {
  const examplePath = path.join(dir, filename);
  fs.writeFileSync(examplePath, content);
  return examplePath;
}

function getHtmlExample() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vertex Editor - Example</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #0a0a0a;
      color: #e5e5e5;
      line-height: 1.6;
    }
    
    h1 {
      color: #a78bfa;
      margin-bottom: 8px;
      font-size: 2rem;
    }
    
    .subtitle {
      color: #888;
      margin-bottom: 32px;
    }
    
    .controls {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    
    select, button {
      padding: 8px 16px;
      border-radius: 6px;
      border: 1px solid #333;
      background: #1a1a1a;
      color: #e5e5e5;
      font-size: 14px;
      cursor: pointer;
    }
    
    button {
      background: #7c3aed;
      border-color: #7c3aed;
    }
    
    button:hover {
      background: #6d28d9;
    }
    
    .editor-wrapper {
      border: 1px solid #333;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 24px;
    }
    
    .output {
      background: #111;
      border: 1px solid #222;
      border-radius: 8px;
      padding: 16px;
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 13px;
      color: #888;
      min-height: 60px;
    }
    
    .output pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <h1>🚀 Vertex Editor</h1>
  <p class="subtitle">A lightweight code editor Web Component</p>
  
  <div class="controls">
    <select id="language">
      <option value="typescript">TypeScript</option>
      <option value="javascript">JavaScript</option>
      <option value="html">HTML</option>
      <option value="css">CSS</option>
      <option value="json">JSON</option>
    </select>
    <button onclick="getValue()">Get Value</button>
    <button onclick="setValue()">Set Value</button>
    <button onclick="copyCode()">Copy</button>
  </div>
  
  <div class="editor-wrapper">
    <vertex-editor
      id="editor"
      value="// Welcome to Vertex Editor! 🎉\n// Try editing this code...\n\nconst greeting = 'Hello World!';\nconsole.log(greeting);\n\n// Change the language above to see syntax highlighting"
      language="typescript"
      theme="dark"
      lineNumbers="true"
      height="350px"
    ></vertex-editor>
  </div>
  
  <div class="output" id="output">
    <pre>Click "Get Value" to see the editor content...</pre>
  </div>

  <script src="web-editor.min.js"></script>
  <script>
    const editor = document.getElementById('editor');
    const languageSelect = document.getElementById('language');
    const output = document.getElementById('output');
    
    // Change language
    languageSelect.addEventListener('change', (e) => {
      editor.setAttribute('language', e.target.value);
    });
    
    // Get value
    function getValue() {
      const value = editor.getValue();
      output.innerHTML = '<pre>' + escapeHtml(value) + '</pre>';
    }
    
    // Set value
    function setValue() {
      const code = '// Code updated at ' + new Date().toLocaleTimeString() + '\\nconsole.log("Hello!");';
      editor.setValue(code);
    }
    
    // Copy to clipboard
    async function copyCode() {
      const value = editor.getValue();
      await navigator.clipboard.writeText(value);
      output.innerHTML = '<pre>✓ Code copied to clipboard!</pre>';
      setTimeout(getValue, 2000);
    }
    
    function escapeHtml(text) {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  </script>
</body>
</html>
`;
}

function getReactExample() {
  return `import { useEffect, useRef, useState } from 'react';
import '@vertex/web-editor';

// CodeEditor component for React
export function CodeEditor({ 
  initialValue = '', 
  language = 'typescript',
  theme = 'dark',
  height = '400px',
  readOnly = false,
  onChange,
  onReady
}) {
  const editorRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleReady = () => {
      setIsReady(true);
      onReady?.(editor);
    };

    editor.addEventListener('ready', handleReady);
    
    // Check if already ready
    if (editor.isInitialized) {
      setIsReady(true);
    }

    return () => editor.removeEventListener('ready', handleReady);
  }, [onReady]);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && isReady && initialValue) {
      const current = editor.getValue();
      if (current !== initialValue) {
        editor.setValue(initialValue);
      }
    }
  }, [initialValue, isReady]);

  return (
    <vertex-editor
      ref={editorRef}
      language={language}
      theme={theme}
      height={height}
      readonly={readOnly.toString()}
      lineNumbers="true"
      style={{ 
        display: 'block',
        opacity: isReady ? 1 : 0,
        transition: 'opacity 0.3s'
      }}
    />
  );
}

// Usage example
export default function App() {
  const [code, setCode] = useState('const sum = (a, b) => a + b;');

  return (
    <div className="app">
      <h1>Vertex Editor in React</h1>
      <CodeEditor
        initialValue={code}
        language="typescript"
        onReady={(editor) => console.log('Editor ready:', editor)}
      />
    </div>
  );
}
`;
}

function getVueExample() {
  return `<script setup>
import { ref, onMounted } from 'vue';
import '@vertex/web-editor';

const props = defineProps({
  modelValue: { type: String, default: '' },
  language: { type: String, default: 'typescript' },
  theme: { type: String, default: 'dark' },
  height: { type: String, default: '400px' },
  readOnly: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue', 'ready']);

const editorRef = ref(null);
const isReady = ref(false);

onMounted(() => {
  const editor = editorRef.value;
  if (!editor) return;

  editor.addEventListener('ready', () => {
    isReady.value = true;
    emit('ready', editor);
    
    // Set initial value
    if (props.modelValue) {
      editor.setValue(props.modelValue);
    }
  });
});

function getValue() {
  return editorRef.value?.getValue() || '';
}

function setValue(value) {
  editorRef.value?.setValue(value);
}

defineExpose({ getValue, setValue });
</script>

<template>
  <vertex-editor
    ref="editorRef"
    :language="language"
    :theme="theme"
    :height="height"
    :readonly="readOnly.toString()"
    lineNumbers="true"
    style="display: block"
  />
</template>
`;
}

async function main() {
  log('🚀 Vertex Editor Installer\\n', 'cyan');

  try {
    // Ensure target directory exists
    const absoluteTargetDir = path.resolve(targetDir);
    if (!fs.existsSync(absoluteTargetDir)) {
      fs.mkdirSync(absoluteTargetDir, { recursive: true });
      log(`✓ Created directory: ${targetDir}`, 'green');
    }

    const destPath = path.join(absoluteTargetDir, 'web-editor.min.js');

    // Try to download from CDN, fallback to local file
    log('📦 Downloading Vertex Editor...', 'blue');
    try {
      await downloadFile(CDN_URL, destPath);
      log(`✓ Downloaded from CDN`, 'green');
    } catch (downloadErr) {
      log('⚠ CDN download failed, using local file...', 'yellow');
      if (fs.existsSync(FALLBACK_LOCAL)) {
        await copyLocalFile(FALLBACK_LOCAL, destPath);
        log(`✓ Copied from local build`, 'green');
      } else {
        throw new Error('Could not find web-editor.min.js');
      }
    }

    log(`  Location: ${destPath}`, 'reset');

    // Create example files
    log('\\n📄 Creating example files...', 'blue');
    
    const htmlExample = createExample(absoluteTargetDir, 'vertex-editor-example.html', getHtmlExample());
    log(`✓ ${path.basename(htmlExample)}`, 'green');
    
    const reactExample = createExample(absoluteTargetDir, 'ReactExample.jsx', getReactExample());
    log(`✓ ${path.basename(reactExample)}`, 'green');
    
    const vueExample = createExample(absoluteTargetDir, 'VueExample.vue', getVueExample());
    log(`✓ ${path.basename(vueExample)}`, 'green');

    // Print success message
    log('\\n✅ Installation complete!', 'green');
    log('\\n📖 Quick Start:', 'cyan');
    log(`  1. Open ${path.basename(htmlExample)} in your browser`);
    log(`  2. Or include the script in your project:`);
    log(`     <script src="${path.relative(process.cwd(), destPath)}"><\\/script>`);
    log(`  3. Use the component:`);
    log(`     <vertex-editor language="typescript" theme="dark"><\\/vertex-editor>`);
    
    log('\\n📚 Framework Examples:', 'cyan');
    log(`  - React: See ${path.basename(reactExample)}`);
    log(`  - Vue: See ${path.basename(vueExample)}`);
    
    log('\\n🔗 Documentation: https://github.com/your-repo/vertex-editor#readme', 'cyan');

  } catch (error) {
    log(`\\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
