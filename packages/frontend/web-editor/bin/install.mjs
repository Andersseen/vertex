#!/usr/bin/env node

/**
 * Vertex Editor CLI Installer
 * 
 * Installs the Vertex Editor web component to any project.
 * Can download from remote (GitHub) or serve from local monorepo.
 * 
 * Usage:
 *   node install.mjs [target-directory] [options]
 * 
 * Options:
 *   --local       Use local monorepo build (default if inside vertex repo)
 *   --remote      Download from GitHub (default if outside vertex repo)
 *   --url=<url>   Use custom URL to download web-editor.min.js
 *   --serve       Start local server and install from localhost
 *   --port=8080   Port for local server (default: 8080)
 * 
 * Examples:
 *   # Install from GitHub to current project
 *   npx github:your-username/vertex-editor/bin/install.mjs ./public
 * 
 *   # Install from local monorepo
 *   node install.mjs ~/my-project/public --local
 * 
 *   # Use custom URL
 *   node install.mjs ./public --url=https://example.com/web-editor.min.js
 * 
 *   # Start local server and install from there
 *   node install.mjs --serve
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.join(__dirname, '..');
const LOCAL_BUILD_PATH = path.join(PACKAGE_ROOT, 'dist', 'web-editor.min.js');
const LOCAL_SOURCEMAP_PATH = path.join(PACKAGE_ROOT, 'dist', 'web-editor.min.js.map');

// GitHub raw URL (change this to your actual repo)
const GITHUB_USER = 'your-username';
const GITHUB_REPO = 'vertex';
const GITHUB_BRANCH = 'main';
const REMOTE_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/packages/frontend/web-editor/dist/web-editor.min.js`;
const REMOTE_SOURCEMAP_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/packages/frontend/web-editor/dist/web-editor.min.js.map`;

const args = process.argv.slice(2);
let targetDir = './public';
let useLocal = false;
let useRemote = false;
let customUrl = null;
let serveMode = false;
let servePort = 8080;

// Parse arguments
args.forEach(arg => {
  if (arg === '--local') {
    useLocal = true;
  } else if (arg === '--remote') {
    useRemote = true;
  } else if (arg === '--serve') {
    serveMode = true;
  } else if (arg.startsWith('--url=')) {
    customUrl = arg.replace('--url=', '');
  } else if (arg.startsWith('--port=')) {
    servePort = parseInt(arg.replace('--port=', ''), 10);
  } else if (!arg.startsWith('--')) {
    targetDir = arg;
  }
});

// Auto-detect if we're inside the vertex monorepo
const isInsideMonorepo = fs.existsSync(path.join(PACKAGE_ROOT, '..', '..', '..', 'package.json')) &&
  fs.existsSync(LOCAL_BUILD_PATH);

// Default behavior: local if inside monorepo, remote otherwise
if (!useLocal && !useRemote && !customUrl && !serveMode) {
  useLocal = isInsideMonorepo;
  useRemote = !isInsideMonorepo;
}

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
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    
    client.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
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

function copyFile(src, dest) {
  return new Promise((resolve, reject) => {
    fs.copyFile(src, dest, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function startLocalServer(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const filePath = req.url === '/web-editor.min.js' ? LOCAL_BUILD_PATH :
                       req.url === '/web-editor.min.js.map' ? LOCAL_SOURCEMAP_PATH :
                       null;
      
      if (!filePath || !fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const contentType = filePath.endsWith('.map') ? 'application/json' : 'application/javascript';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(filePath).pipe(res);
    });

    server.listen(port, () => {
      log(`📡 Local server running at http://localhost:${port}`, 'green');
      resolve(server);
    });

    server.on('error', reject);
  });
}

async function installFromLocal(absoluteTargetDir) {
  if (!fs.existsSync(LOCAL_BUILD_PATH)) {
    throw new Error('Local build not found. Run "npm run build" in the web-editor package first.');
  }

  log('📦 Installing from local monorepo...', 'blue');
  
  const destPath = path.join(absoluteTargetDir, 'web-editor.min.js');
  await copyFile(LOCAL_BUILD_PATH, destPath);
  log('✓ Copied: web-editor.min.js', 'green');

  if (fs.existsSync(LOCAL_SOURCEMAP_PATH)) {
    await copyFile(LOCAL_SOURCEMAP_PATH, path.join(absoluteTargetDir, 'web-editor.min.js.map'));
    log('✓ Copied: web-editor.min.js.map', 'green');
  }
}

async function installFromRemote(url, absoluteTargetDir) {
  log(`📦 Downloading from remote...`, 'blue');
  log(`  URL: ${url}`, 'cyan');
  
  const destPath = path.join(absoluteTargetDir, 'web-editor.min.js');
  await downloadFile(url, destPath);
  log('✓ Downloaded: web-editor.min.js', 'green');

  // Try to download sourcemap
  try {
    const sourcemapUrl = url.replace('.min.js', '.min.js.map');
    await downloadFile(sourcemapUrl, path.join(absoluteTargetDir, 'web-editor.min.js.map'));
    log('✓ Downloaded: web-editor.min.js.map', 'green');
  } catch {
    // Sourcemap is optional
  }
}

async function main() {
  log('🚀 Vertex Editor Installer\\n', 'cyan');

  try {
    // Serve mode: start server and exit
    if (serveMode) {
      if (!fs.existsSync(LOCAL_BUILD_PATH)) {
        log('❌ Build not found! Run: npm run build', 'red');
        process.exit(1);
      }
      
      log(`📡 Starting local server on port ${servePort}...`, 'blue');
      log(`   Files available at:`, 'reset');
      log(`   - http://localhost:${servePort}/web-editor.min.js`, 'cyan');
      log(`   - http://localhost:${servePort}/web-editor.min.js.map`, 'cyan');
      log(`\\nPress Ctrl+C to stop\\n`, 'yellow');
      
      const server = await startLocalServer(servePort);
      
      // Keep alive
      process.on('SIGINT', () => {
        log('\\n👋 Stopping server...', 'blue');
        server.close();
        process.exit(0);
      });
      
      return;
    }

    // Ensure target directory exists
    const absoluteTargetDir = path.resolve(targetDir);
    if (!fs.existsSync(absoluteTargetDir)) {
      fs.mkdirSync(absoluteTargetDir, { recursive: true });
      log(`✓ Created directory: ${targetDir}`, 'green');
    }

    // Install from appropriate source
    if (useLocal) {
      await installFromLocal(absoluteTargetDir);
    } else if (customUrl) {
      await installFromRemote(customUrl, absoluteTargetDir);
    } else if (useRemote) {
      try {
        await installFromRemote(REMOTE_URL, absoluteTargetDir);
      } catch (err) {
        log(`\\n⚠️  Remote download failed: ${err.message}`, 'yellow');
        
        if (isInsideMonorepo) {
          log('📦 Falling back to local build...', 'blue');
          await installFromLocal(absoluteTargetDir);
        } else {
          throw err;
        }
      }
    }

    // Success message
    log('\\n✅ Installation complete!', 'green');
    log('\\n📖 Quick Start:', 'cyan');
    log(`  Include in your HTML:`, 'reset');
    log(`     <script src="web-editor.min.js"><\\/script>`, 'cyan');
    log(`  Use the component:`, 'reset');
    log(`     <vertex-editor language="typescript" theme="dark"><\\/vertex-editor>`, 'cyan');

  } catch (error) {
    log(`\\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
