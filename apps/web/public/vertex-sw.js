// Vertex IDE — Preview Service Worker
// Intercepts requests under /vertex-preview/* and serves from in-memory VirtualFS.
// This file is served as a static asset; do not bundle it with the main app.

const PREVIEW_PREFIX = '/vertex-preview'
const virtualFiles = new Map()

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (!url.pathname.startsWith(PREVIEW_PREFIX)) return
  event.respondWith(handleRequest(url.pathname))
})

async function handleRequest(pathname) {
  // Strip the prefix to get the virtual path
  let path = pathname.slice(PREVIEW_PREFIX.length) || '/index.html'
  if (path === '') path = '/index.html'

  let content = virtualFiles.get(path)

  // SPA fallback: if no file and path has no extension, serve index.html
  if (content === undefined && !path.includes('.')) {
    content = virtualFiles.get('/index.html')
    path = '/index.html'
  }

  if (content === undefined) {
    return new Response(`File not found: ${path}`, {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': getMimeType(path),
      'Cache-Control': 'no-cache',
    },
  })
}

function getMimeType(path) {
  const ext = path.split('.').pop()?.toLowerCase()
  const types = {
    html: 'text/html; charset=utf-8',
    js: 'application/javascript',
    mjs: 'application/javascript',
    css: 'text/css',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    txt: 'text/plain',
  }
  return types[ext ?? ''] ?? 'application/octet-stream'
}

self.addEventListener('message', (event) => {
  const msg = event.data
  if (!msg?.type) return

  switch (msg.type) {
    case 'MOUNT_FILES':
      for (const [path, content] of Object.entries(msg.files)) {
        virtualFiles.set(path, content)
      }
      event.source?.postMessage({ type: 'READY' })
      break

    case 'UPDATE_FILE':
      virtualFiles.set(msg.path, msg.content)
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'FILE_UPDATED', path: msg.path })
        })
      })
      break

    case 'DELETE_FILE':
      virtualFiles.delete(msg.path)
      break

    case 'CLEAR':
      virtualFiles.clear()
      break

    case 'PING':
      event.source?.postMessage({ type: 'PONG' })
      break
  }
})
