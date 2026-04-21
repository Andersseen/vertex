# Phase 3 - Preview (Service Worker + iframe)

> **Goal:** Run the built app inside an iframe with hot reload on file edits.
> **Prerequisite:** Phase 1 + Phase 2 completed.
> **Estimated duration:** 2-3 weeks
> **Result:** The editor shows a live app preview while you edit files.

---

## Core idea

```
VirtualFS (dist/)
    ->
Service Worker intercepts fetch('/vertex-preview/...')
    ->
Returns file content from VirtualFS (no real backend server)
    ->
iframe loads the app as if it was served over HTTP
```

The key trick is that the Service Worker simulates an HTTP server in the browser.

---

## Files to implement

```
packages/frontend/runtime/src/
|- preview/
|  |- service-worker/
|  |  |- sw.ts
|  |  '- sw-manager.ts
|  |- hot-reload.ts
|  |- template.ts
|  '- index.ts
'- types/
   '- preview.types.ts
```

Important: `sw.ts` must be compiled and served as a standalone Service Worker file, not bundled into the main runtime entry.

---

## Key interfaces

### `preview.types.ts`

```typescript
export interface PreviewConfig {
  baseUrl: string; // e.g. '/vertex-preview'
  serveDir: string; // e.g. '/dist'
  indexHtml?: string; // optional explicit index path
}

export interface PreviewSession {
  url: string;
  reload(): void;
  hotReload(paths: string[]): Promise<void>;
  destroy(): void;
}

export interface IPreviewManager {
  start(config: PreviewConfig): Promise<PreviewSession>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

export type SWMessage =
  | { type: "MOUNT_FILES"; files: Record<string, string> }
  | { type: "UPDATE_FILE"; path: string; content: string }
  | { type: "DELETE_FILE"; path: string }
  | { type: "CLEAR" }
  | { type: "PING" };

export type SWResponse =
  | { type: "READY" }
  | { type: "PONG" }
  | { type: "FILE_UPDATED"; path: string };
```

---

## Step-by-step implementation

### Step 1 - `service-worker/sw.ts`

- Keep an in-memory map: `virtualFiles: Map<string, string>`.
- Intercept only preview routes (for example `/vertex-preview/*`).
- Return `index.html` as SPA fallback when route has no extension.
- Handle messages from main thread:
  - `MOUNT_FILES`
  - `UPDATE_FILE`
  - `DELETE_FILE`
  - `CLEAR`
  - `PING`

Minimal behavior:

```typescript
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith("/vertex-preview")) return;
  event.respondWith(handleRequest(url.pathname));
});
```

For request handling:

- Normalize path relative to preview prefix.
- Resolve to `/index.html` when needed.
- Return MIME type by extension.

---

### Step 2 - `service-worker/sw-manager.ts`

Responsibilities:

- Register and activate SW.
- Send messages to SW.
- Wait for handshake responses when required (`READY`, `PONG`).
- Mount the full build output and keep SW state updated.

Notes:

- Prefer `MessageChannel` for request/response patterns.
- Support fallback target when `navigator.serviceWorker.controller` is null on first load.

---

### Step 3 - `template.ts`

Generate `index.html` when a build does not provide one.

```typescript
export function generateIndexHtml(options: {
  title: string;
  entryScript: string;
  cssFiles?: string[];
}): string;
```

Use relative asset URLs for preview compatibility.

---

### Step 4 - `hot-reload.ts`

Responsibilities:

- Watch build directory changes.
- Debounce rapid updates.
- Push updated file content to SW.
- Notify iframe via `postMessage({ type: 'HMR_UPDATE', paths })`.

---

### Step 5 - `preview-manager.ts`

Responsibilities:

- Register SW.
- Collect files from `serveDir`.
- Ensure `/index.html` exists (generated fallback if needed).
- Mount files into SW.
- Create and control session lifecycle (`start`, `reload`, `stop`, `destroy`).

Expected output from `start()`:

```typescript
{
  url: `${config.baseUrl}/index.html`,
  reload: () => { ... },
  hotReload: async (paths) => { ... },
  destroy: () => { ... }
}
```

---

## Angular web app integration

In the web app preview panel:

- Build project into `/dist`.
- Instantiate `PreviewManager(fs)`.
- Call `start({ baseUrl: '/vertex-preview', serveDir: '/dist' })`.
- Bind returned URL to iframe `src`.
- Wire `reload` and `stop` actions to toolbar buttons.

Recommended panel states:

- idle: "Run Preview"
- building: disabled button + progress text
- running: show `Stop`, `Reload`, and current preview URL

---

## Acceptance criteria for "Phase 3 complete"

- [ ] Clicking Run Preview builds and opens iframe URL.
- [ ] SW serves files from VirtualFS under preview prefix.
- [ ] SPA fallback works (`/vertex-preview/some/route` -> `index.html`).
- [ ] CSS/JS assets load correctly from preview path.
- [ ] File edits trigger hot reload updates without full reset.
- [ ] Stop Preview clears SW-mounted state and unregisters cleanly.
- [ ] Works in Chromium and Firefox.

---

## Common pitfalls

- `MOUNT_FILES` handshake never resolves due to wrong message channel response target.
- Preview starts, then immediately stops because component lifecycle/effect tracks running signal incorrectly.
- Generated HTML uses absolute `/main.js` instead of relative `main.js` inside preview route.
- Stale files remain in `/dist` and shadow latest output.
