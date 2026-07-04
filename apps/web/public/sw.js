const CACHE_NAME = 'vertex-ide-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache same-origin GET requests. Sidecar/API requests (e.g. to
  // 127.0.0.1:3001) must reach the network unmodified.
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).catch(() => {
        // SPA fallback: only for navigation requests so API/data requests
        // surface real failures instead of returning HTML.
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        throw new Error('Network request failed');
      });
    }),
  );
});
