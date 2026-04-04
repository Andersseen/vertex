#!/usr/bin/env node

/**
 * Vertex Editor Installer
 * 
 * Installs the Vertex Editor web component to any project.
 * 
 * Usage:
 *   node install.mjs [target-directory] [options]
 * 
 * Install from GitHub (recommended):
 *   curl -fsSL https://raw.githubusercontent.com/andersseen/vertex/main/scripts/install.mjs | node - ./public
 * 
 * Or download first:
 *   curl -O https://raw.githubusercontent.com/andersseen/vertex/main/scripts/install.mjs
 *   node install.mjs ./public
 * 
 * Options:
 *   --local     Force local build (if inside monorepo)
 *   --remote    Force remote download from GitHub
 *   --url=URL   Use custom URL
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if running from stdin/pipe
const isPiped = !process.stdin.isTTY;

// GitHub configuration
const GITHUB_USER = 'andersseen';
const GITHUB_REPO = 'vertex';
const GITHUB_BRANCH = 'main';

// Remote URLs
const REMOTE_JS_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/packages/frontend/web-editor/dist/web-editor.min.js`;
const REMOTE_MAP_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/packages/frontend/web-editor/dist/web-editor.min.js.map`;
const REMOTE_SCRIPT_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/scripts/install.mjs`;

// Parse arguments (handle both piped and direct execution)
const args = process.argv.slice(2);
let targetDir = './public';
let useLocal = false;
let useRemote = false;
let customUrl = null;
let showHelp = false;

for (const arg of args) {
  if (arg === '--help' || arg === '-h') showHelp = true;
  else if (arg === '--local') useLocal = true;
  else if (arg === '--remote') useRemote = true;
  else if (arg.startsWith('--url=')) customUrl = arg.replace('--url=', '');
  else if (!arg.startsWith('--') && arg.length > 0) targetDir = arg;
}

// Show help
if (showHelp) {
  console.log(`
Vertex Editor Installer

Usage:
  node install.mjs [target-directory] [options]

Install Methods:
  1. Direct from GitHub (recommended):
     curl -fsSL ${REMOTE_SCRIPT_URL} | node - ./public

  2. Download then run:
     curl -O ${REMOTE_SCRIPT_URL}
     node install.mjs ./public

  3. From local monorepo:
     git clone https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git
     cd ${GITHUB_REPO}
     node scripts/install.mjs ./public --local

Options:
  --local       Use local build (if inside monorepo)
  --remote      Force download from GitHub
  --url=URL     Use custom URL to download web-editor.min.js
  --help, -h    Show this help

Examples:
  node install.mjs ./public
  node install.mjs ./static --remote
  node install.mjs ./public --url=https://example.com/editor.min.js
`);
  process.exit(0);
}

// Detect if we're inside the vertex monorepo
const isInsideMonorepo = fs.existsSync(path.join(__dirname, '..', 'package.json')) && 
                         fs.existsSync(path.join(__dirname, '..', 'packages', 'frontend', 'web-editor'));

// Determine source
if (!useLocal && !useRemote && !customUrl) {
  useLocal = isInsideMonorepo;
  useRemote = !isInsideMonorepo;
}

// Colors for terminal
const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

const log = (msg, color = 'reset') => console.log(`${C[color]}${msg}${C.reset}`);

// Helper: Download file
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      } else if (res.statusCode === 301 || res.statusCode === 302) {
        download(res.headers.location, dest).then(resolve).catch(reject);
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// Helper: Copy file
function copy(src, dest) {
  return new Promise((resolve, reject) => {
    fs.copyFile(src, dest, (err) => err ? reject(err) : resolve());
  });
}

// Helper: Create example file
function createExample(dir, filename, content) {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

// Example templates
const getHtmlExample = () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vertex Editor</title>
  <style>
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      max-width: 800px; 
      margin: 50px auto; 
      padding: 20px; 
      background: #0a0a0a; 
      color: #e5e5e5; 
      line-height: 1.6;
    }
    h1 { color: #a78bfa; }
    .editor { 
      border: 1px solid #333; 
      border-radius: 8px; 
      overflow: hidden; 
      margin: 20px 0; 
    }
  </style>
</head>
<body>
  <h1>🚀 Vertex Editor</h1>
  <p>A lightweight code editor Web Component</p>
  <div class="editor">
    <vertex-editor
      value="const greeting = 'Hello World!';\nconsole.log(greeting);"
      language="typescript"
      theme="dark"
      lineNumbers="true"
      height="300px"
    ></vertex-editor>
  </div>
  <script src="web-editor.min.js"></script>
</body>
</html>`;

const getReactExample = () => `import { useRef, useEffect } from 'react';
import './web-editor.min.js';

export function CodeEditor({ code, language = 'typescript', onChange }) {
  const editorRef = useRef(null);
  
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && code) {
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
}`;

const getVueExample = () => `<script setup>
import { ref, onMounted } from 'vue';
import './web-editor.min.js';

const props = defineProps({ 
  code: String,
  language: { type: String, default: 'typescript' }
});

const editor = ref(null);

onMounted(() => {
  if (props.code) {
    editor.value?.setValue(props.code);
  }
});
<\/script>

<template>
  <vertex-editor 
    ref="editor" 
    :value="code" 
    :language="language" 
    theme="dark"
    lineNumbers="true"
    height="400px"
  />
</template>`;

// Main
async function main() {
  log('🚀 Vertex Editor Installer\\n', 'cyan');

  try {
    const target = path.resolve(targetDir);
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
      log(`✓ Created: ${targetDir}`, 'green');
    }

    const jsDest = path.join(target, 'web-editor.min.js');
    const mapDest = path.join(target, 'web-editor.min.js.map');

    // Install from source
    if (useLocal) {
      const localPath = path.join(__dirname, '..', 'packages', 'frontend', 'web-editor', 'dist', 'web-editor.min.js');
      const localMapPath = path.join(__dirname, '..', 'packages', 'frontend', 'web-editor', 'dist', 'web-editor.min.js.map');
      
      if (!fs.existsSync(localPath)) {
        log('❌ Local build not found!', 'red');
        log('\\nTo build locally:', 'yellow');
        log('  cd packages/frontend/web-editor', 'gray');
        log('  npm install', 'gray');
        log('  npm run build\\n', 'gray');
        process.exit(1);
      }
      
      log('📦 Installing from local build...', 'blue');
      await copy(localPath, jsDest);
      if (fs.existsSync(localMapPath)) await copy(localMapPath, mapDest);
      log('✓ Installed from local build', 'green');
      
    } else if (customUrl) {
      log(`📦 Downloading from custom URL...`, 'blue');
      log(`  ${customUrl}`, 'gray');
      await download(customUrl, jsDest);
      log('✓ Downloaded', 'green');
      
    } else {
      log('📦 Downloading from GitHub...', 'blue');
      log(`  ${REMOTE_JS_URL.replace('https://', '')}`, 'gray');
      try {
        await download(REMOTE_JS_URL, jsDest);
        try {
          await download(REMOTE_MAP_URL, mapDest);
        } catch {
          // Sourcemap is optional
        }
        log('✓ Downloaded from GitHub', 'green');
      } catch (err) {
        if (isInsideMonorepo) {
          log('⚠️  Remote download failed, trying local build...', 'yellow');
          const localPath = path.join(__dirname, '..', 'packages', 'frontend', 'web-editor', 'dist', 'web-editor.min.js');
          if (fs.existsSync(localPath)) {
            await copy(localPath, jsDest);
            log('✓ Installed from local build', 'green');
          } else {
            throw new Error('Neither remote nor local build available');
          }
        } else {
          log('\\n❌ Failed to download from GitHub', 'red');
          log('\\nPossible solutions:', 'yellow');
          log('  1. Check your internet connection', 'gray');
          log('  2. Clone the repo and use --local flag:', 'gray');
          log(`     git clone https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git`, 'cyan');
          log(`     cd ${GITHUB_REPO}`, 'cyan');
          log('     node scripts/install.mjs ./public --local', 'cyan');
          log('  3. Download manually:', 'gray');
          log(`     ${REMOTE_JS_URL}`, 'cyan');
          process.exit(1);
        }
      }
    }

    // Create examples
    log('\\n📄 Creating examples...', 'blue');
    const htmlPath = createExample(target, 'vertex-editor-example.html', getHtmlExample());
    const reactPath = createExample(target, 'ReactExample.jsx', getReactExample());
    const vuePath = createExample(target, 'VueExample.vue', getVueExample());
    log('✓ vertex-editor-example.html', 'green');
    log('✓ ReactExample.jsx', 'green');
    log('✓ VueExample.vue', 'green');

    // File sizes
    const jsStats = fs.statSync(jsDest);
    log(`\\n📊 File size: ${(jsStats.size / 1024 / 1024).toFixed(2)} MB`, 'blue');

    // Success
    log('\\n✅ Installation complete!', 'green');
    log('\\n📖 Quick Start:', 'cyan');
    log('  <script src="web-editor.min.js"></script>');
    log('  <vertex-editor value="const x = 1;" language="typescript"></vertex-editor>');
    log(`\\n🎉 Open ${path.relative(process.cwd(), htmlPath)} in your browser!`, 'cyan');

    // Show next steps based on installation method
    if (useRemote) {
      log('\\n💡 Tip: To update, run the install command again', 'gray');
    }

  } catch (err) {
    log(`\\n❌ Error: ${err.message}`, 'red');
    process.exit(1);
  }
}

main();
