#!/usr/bin/env node

/**
 * Vertex Editor Local Server Worker
 * 
 * Serves the web-editor files from the local monorepo.
 * Supports HTTP and WebSocket for hot reload.
 * 
 * Usage:
 *   node serve-worker.mjs [port]
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws'; // Optional dependency

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.join(__dirname, '..');
const DIST_PATH = path.join(PACKAGE_ROOT, 'dist');

const PORT = parseInt(process.argv[2], 10) || 8080;

const MIME_TYPES = {
  '.js': 'application/javascript',
  '.js.map': 'application/json',
  '.html': 'text/html',
  '.css': 'text/css',
};

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Serve specific files
  let filePath;
  if (pathname === '/web-editor.min.js') {
    filePath = path.join(DIST_PATH, 'web-editor.min.js');
  } else if (pathname === '/web-editor.min.js.map') {
    filePath = path.join(DIST_PATH, 'web-editor.min.js.map');
  } else if (pathname === '/web-editor.js') {
    filePath = path.join(DIST_PATH, 'web-editor.js');
  } else if (pathname === '/') {
    // Serve info page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getInfoPage());
    return;
  } else {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end(`File not found: ${pathname}\\nRun "npm run build" first.`);
    return;
  }

  // Serve file
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache',
  });

  fs.createReadStream(filePath).pipe(res);
});

function getInfoPage() {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Vertex Editor Server</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #0a0a0a;
      color: #e5e5e5;
    }
    h1 { color: #a78bfa; }
    .endpoint {
      background: #1a1a1a;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
      font-family: 'Monaco', monospace;
    }
    .endpoint a {
      color: #7c3aed;
      text-decoration: none;
    }
    code {
      background: #222;
      padding: 2px 6px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h1>🚀 Vertex Editor Local Server</h1>
  <p>Server is running. Available files:</p>
  
  <div class="endpoint">
    <strong>Minified:</strong><br>
    <a href="/web-editor.min.js">http://localhost:${PORT}/web-editor.min.js</a>
  </div>
  
  <div class="endpoint">
    <strong>Source Map:</strong><br>
    <a href="/web-editor.min.js.map">http://localhost:${PORT}/web-editor.min.js.map</a>
  </div>
  
  <div class="endpoint">
    <strong>Development:</strong><br>
    <a href="/web-editor.js">http://localhost:${PORT}/web-editor.js</a>
  </div>

  <h2>Install in your project:</h2>
  <div class="endpoint">
    curl http://localhost:${PORT}/web-editor.min.js -o public/web-editor.min.js
  </div>

  <p>Or use the CLI:</p>
  <div class="endpoint">
    node bin/install.mjs ./public --url=http://localhost:${PORT}/web-editor.min.js
  </div>
</body>
</html>`;
}

server.listen(PORT, () => {
  console.log('🚀 Vertex Editor Local Server');
  console.log('');
  console.log(`📡 Server running at: http://localhost:${PORT}`);
  console.log('');
  console.log('Available files:');
  console.log(`  - http://localhost:${PORT}/web-editor.min.js`);
  console.log(`  - http://localhost:${PORT}/web-editor.min.js.map`);
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
});

// Watch for file changes and notify clients (optional)
const watcher = fs.watch(DIST_PATH, (eventType, filename) => {
  if (filename && (filename.endsWith('.js') || filename.endsWith('.map'))) {
    console.log(`📝 File changed: ${filename}`);
    console.log('   Refresh your browser to get the latest version');
  }
});

process.on('SIGINT', () => {
  console.log('\\n👋 Stopping server...');
  watcher.close();
  server.close();
  process.exit(0);
});
