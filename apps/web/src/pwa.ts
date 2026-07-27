// Service-worker registration plus recovery from a stale app shell.
//
// A cached index.html that outlives its deployment points at hashed
// /assets/*.js chunks the server no longer has. Cloudflare Pages answers those
// with the SPA catch-all (`/* /index.html 200`), so the browser reports a MIME
// error — "Expected a JavaScript-or-Wasm module script … got text/html" —
// instead of a 404, and every lazy route fails to load. The service worker no
// longer precaches index.html, but clients that already hold the old shell need
// a way out: drop all caches, unregister the worker, reload once.

const RELOAD_FLAG = 'vertex:stale-shell-reload';

const STALE_SHELL_SIGNATURES = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
  'Expected a JavaScript-or-Wasm module script',
];

function isStaleShellError(reason: unknown): boolean {
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === 'string'
        ? reason
        : '';

  return STALE_SHELL_SIGNATURES.some((signature) => message.includes(signature));
}

async function recoverFromStaleShell(): Promise<void> {
  try {
    // One attempt per tab: if the reload does not fix it the problem is not a
    // stale shell, and looping would make the app unusable.
    if (sessionStorage.getItem(RELOAD_FLAG)) return;
    sessionStorage.setItem(RELOAD_FLAG, '1');

    console.warn('[PWA] Stale app shell detected — clearing caches and reloading.');

    if ('caches' in globalThis) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch (err) {
    console.warn('[PWA] Stale shell cleanup failed:', err);
  } finally {
    location.reload();
  }
}

function installStaleShellRecovery(): void {
  window.addEventListener('unhandledrejection', (event) => {
    if (isStaleShellError(event.reason)) void recoverFromStaleShell();
  });

  // Failed <script type="module"> loads do not reject — they emit a resource
  // error that does not bubble, so it is only observable in the capture phase.
  window.addEventListener(
    'error',
    (event) => {
      if (isStaleShellError(event.error ?? event.message)) void recoverFromStaleShell();
    },
    true,
  );
}

/** Marks the current shell as healthy so a future deploy can recover again. */
export function markShellHealthy(): void {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    // Storage is unavailable (private mode, blocked cookies) — nothing to clear.
  }
}

export function setupPwa(): void {
  if (!('serviceWorker' in navigator)) return;

  installStaleShellRecovery();

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[PWA] Service worker registration failed:', err);
    });
  });
}
