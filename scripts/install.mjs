#!/usr/bin/env node

/**
 * Vertex Editor Installer
 * 
 * Installs the Vertex Editor web component to any project.
 * Can be run from:
 *   - Inside the monorepo (uses local build)
 *   - Remotely via npx (downloads from GitHub)
 * 
 * Quick install:
 *   npx github:your-username/vertex/scripts/install.mjs ./public
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

// GitHub configuration
const GITHUB_USER = 'your-username';
const GITHUB_REPO = 'vertex';
const GITHUB_BRANCH = 'main';

// Remote URLs
const REMOTE_JS_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/packages/frontend/web-editor/dist/web-editor.min.js`;
const REMOTE_MAP_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/packages/frontend/web-editor/dist/web-editor.min.js.map`;

// Parse arguments
const args = process.argv.slice(2);
let targetDir = './public';
let useLocal = false;
let useRemote = false;
let customUrl = null;

for (const arg of args) {
  if (arg === '--local') useLocal = true;
  else if (arg === '--remote') useRemote = true;
  else if (arg.startsWith('--url=')) customUrl = arg.replace('--url=', '');
  else if (!arg.startsWith('--')) targetDir = arg;
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
    }).on('error', reject);
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
  fs.writeFileSync(path.join(dir, filename), content);
}

// Example templates
const getHtmlExample = () => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Vertex Editor</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #0a0a0a; color: #e5e5e5; }
    .editor { border: 1px solid #333; border-radius: 8px; overflow: hidden; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>🚀 Vertex Editor</h1>
  <div class="editor">
    <vertex-editor
      value="const greeting = 'Hello World!';"
      language="typescript"
      theme="dark"
      height="300px"
    ></vertex-editor>
  </div>
  <script src="web-editor.min.js"></script>
</body>
</html>`;

const getReactExample = () => `import { useRef, useEffect } from 'react';
import './web-editor.min.js';

export function CodeEditor({ code, language = 'typescript' }) {
  const editorRef = useRef(null);
  
  useEffect(() => {
    editorRef.current?.setValue(code);
  }, [code]);

  return (
    <vertex-editor
      ref={editorRef}
      language={language}
      theme="dark"
      lineNumbers="true"
      style={{ display: 'block' }}
    />
  );
}`;

const getVueExample = () => `<script setup>
import { ref, onMounted } from 'vue';
import './web-editor.min.js';

const props = defineProps({ code: String });
const editor = ref(null);

onMounted(() => {
  console.log('Editor ready:', editor.value.getValue());
});
<\/script>

<template>
  <vertex-editor ref="editor" :value="code" language="typescript" theme="dark" />
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
        log('Run: cd packages/frontend/web-editor && npm run build', 'yellow');
        process.exit(1);
      }
      
      log('📦 Installing from local build...', 'blue');
      await copy(localPath, jsDest);
      if (fs.existsSync(localMapPath)) await copy(localMapPath, mapDest);
      log('✓ Installed from local build', 'green');
      
    } else if (customUrl) {
      log(`📦 Downloading from custom URL...`, 'blue');
      await download(customUrl, jsDest);
      log('✓ Downloaded', 'green');
      
    } else {
      log('📦 Downloading from GitHub...', 'blue');
      log(`  ${REMOTE_JS_URL}`, 'cyan');
      try {
        await download(REMOTE_JS_URL, jsDest);
        await download(REMOTE_MAP_URL, mapDest).catch(() => {});
        log('✓ Downloaded from GitHub', 'green');
      } catch (err) {
        if (isInsideMonorepo) {
          log('⚠️ Remote failed, using local build...', 'yellow');
          const localPath = path.join(__dirname, '..', 'packages', 'frontend', 'web-editor', 'dist', 'web-editor.min.js');
          await copy(localPath, jsDest);
          log('✓ Installed from local build', 'green');
        } else {
          throw err;
        }
      }
    }

    // Create examples
    log('\\n📄 Creating examples...', 'blue');
    createExample(target, 'vertex-editor-example.html', getHtmlExample());
    createExample(target, 'ReactExample.jsx', getReactExample());
    createExample(target, 'VueExample.vue', getVueExample());
    log('✓ Examples created', 'green');

    // Success
    log('\\n✅ Installation complete!', 'green');
    log('\\n📖 Quick Start:', 'cyan');
    log('  <script src="web-editor.min.js"></script>');
    log('  <vertex-editor value="const x = 1;" language="typescript"></vertex-editor>');
    log(`\\n🎉 Open ${targetDir}/vertex-editor-example.html to see it in action!`, 'cyan');

  } catch (err) {
    log(`\\n❌ Error: ${err.message}`, 'red');
    process.exit(1);
  }
}

main();
