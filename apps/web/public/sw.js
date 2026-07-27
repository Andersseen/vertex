// Bump this whenever the caching strategy changes — `activate` deletes every
// cache whose name does not match, which is what evicts a stale app shell.
const CACHE_NAME = 'vertex-ide-v2';

// Only content-stable files belong here. index.html must NOT be precached: it
// references hashed /assets/* chunks that disappear on the next deploy, so a
// cache-first shell keeps requesting chunks the server no longer has.
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.svg',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
];

const OFFLINE_SHELL = '/index.html';

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
  // Only handle same-origin GET requests. Sidecar/API requests (e.g. to
  // 127.0.0.1:3001) must reach the network unmodified.
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations are network-first: the served index.html must always match the
  // hashed chunks of the current deployment. The cached copy is an offline
  // fallback only.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // waitUntil keeps the worker alive until the shell is stored; without
          // it the write can be cut short and the offline fallback goes missing.
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.put(OFFLINE_SHELL, copy)),
          );
          return response;
        })
        .catch(() =>
          caches.match(OFFLINE_SHELL).then((cached) => cached ?? Response.error()),
        ),
    );
    return;
  }

  // Hashed build output is immutable, so a cache hit is always correct. A miss
  // goes straight to the network and its failure is never masked with the app
  // shell — a missing chunk has to surface as a real error so the app can
  // recover by reloading.
  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request)),
  );
});
