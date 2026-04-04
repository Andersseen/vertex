#!/usr/bin/env node

/**
 * Vertex Editor Installer
 * 
 * Installs the Vertex Editor web component from GitHub Releases.
 * 
 * Quick install:
 *   curl -fsSL https://raw.githubusercontent.com/andersseen/vertex/main/scripts/install.mjs | node - ./public
 * 
 * Options:
 *   --local     Use local build (if inside monorepo)
 *   --url=URL   Use custom URL
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GitHub configuration
const GITHUB_USER = 'andersseen';
const GITHUB_REPO = 'vertex';
const RELEASE_TAG = 'web-editor-latest';

// Release download URLs (from GitHub Releases)
const RELEASE_JS_URL = `https://github.com/${GITHUB_USER}/${GITHUB_REPO}/releases/download/${RELEASE_TAG}/web-editor.min.js`;
const RELEASE_MAP_URL = `https://github.com/${GITHUB_USER}/${GITHUB_REPO}/releases/download/${RELEASE_TAG}/web-editor.min.js.map`;

// Parse arguments
const args = process.argv.slice(2);
let targetDir = './public';
let useLocal = false;
let customUrl = null;

for (const arg of args) {
  if (arg === '--local') useLocal = true;
  else if (arg.startsWith('--url=')) customUrl = arg.replace('--url=', '');
  else if (!arg.startsWith('--') && arg.length > 0) targetDir = arg;
}

// Detect if we're inside the vertex monorepo
const isInsideMonorepo = fs.existsSync(path.join(__dirname, '..', 'package.json')) && 
                         fs.existsSync(path.join(__dirname, '..', 'packages', 'frontend', 'web-editor'));

if (!useLocal && !customUrl) {
  useLocal = isInsideMonorepo;
}

// Colors
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

// Download with redirect support
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    
    client.get(url, { headers: { 'Accept': 'application/octet-stream' } }, (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
        file.close();
        fs.unlink(dest, () => {});
        download(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      
      if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function copy(src, dest) {
  return new Promise((resolve, reject) => {
    fs.copyFile(src, dest, (err) => err ? reject(err) : resolve());
  });
}

function createExample(dir, filename, content) {
  fs.writeFileSync(path.join(dir, filename), content);
}

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
      height="400px"
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
  if (props.code) editor.value?.setValue(props.code);
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
      
      if (!fs.existsSync(localPath)) {
        log('❌ Local build not found!', 'red');
        log('\\nRun: cd packages/frontend/web-editor && npm run build', 'gray');
        process.exit(1);
      }
      
      log('📦 Installing from local build...', 'blue');
      await copy(localPath, jsDest);
      log('✓ Installed', 'green');
      
    } else if (customUrl) {
      log(`📦 Downloading from custom URL...`, 'blue');
      await download(customUrl, jsDest);
      log('✓ Downloaded', 'green');
      
    } else {
      log('📦 Downloading from GitHub Releases...', 'blue');
      log(`  ${RELEASE_JS_URL.replace('https://', '')}`, 'gray');
      
      try {
        await download(RELEASE_JS_URL, jsDest);
        try {
          await download(RELEASE_MAP_URL, mapDest);
        } catch {
          // Sourcemap optional
        }
        log('✓ Downloaded from GitHub Releases', 'green');
      } catch (err) {
        if (isInsideMonorepo) {
          log('⚠️  Download failed, using local build...', 'yellow');
          const localPath = path.join(__dirname, '..', 'packages', 'frontend', 'web-editor', 'dist', 'web-editor.min.js');
          await copy(localPath, jsDest);
          log('✓ Installed from local build', 'green');
        } else {
          log('\\n❌ Failed to download from GitHub Releases', 'red');
          log('\\nThe release may not exist yet. Options:', 'yellow');
          log('  1. Wait for CI to create the release (push to main)', 'gray');
          log('  2. Clone and build locally:', 'gray');
          log(`     git clone https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git`, 'cyan');
          log('     cd vertex && npm install', 'cyan');
          log('     cd packages/frontend/web-editor && npm run build', 'cyan');
          log('  3. Download manually from:', 'gray');
          log(`     https://github.com/${GITHUB_USER}/${GITHUB_REPO}/releases`, 'cyan');
          process.exit(1);
        }
      }
    }

    // Create examples
    log('\\n📄 Creating examples...', 'blue');
    createExample(target, 'vertex-editor-example.html', getHtmlExample());
    createExample(target, 'ReactExample.jsx', getReactExample());
    createExample(target, 'VueExample.vue', getVueExample());
    log('✓ Examples created', 'green');

    // File size
    const jsStats = fs.statSync(jsDest);
    log(`\\n📊 File size: ${(jsStats.size / 1024 / 1024).toFixed(2)} MB`, 'blue');

    // Success
    log('\\n✅ Installation complete!', 'green');
    log('\\n📖 Quick Start:', 'cyan');
    log('  <script src="web-editor.min.js"></script>');
    log('  <vertex-editor value="const x = 1;" language="typescript"></vertex-editor>');
    log(`\\n🎉 Open ${targetDir}/vertex-editor-example.html to test!`, 'cyan');

  } catch (err) {
    log(`\\n❌ Error: ${err.message}`, 'red');
    process.exit(1);
  }
}

main();
