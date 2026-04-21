# Phase 5 - Deploy Adapters

> **Goal:** Upload `dist/` from VirtualFS directly to Cloudflare Pages or Workers from the browser.
> **Prerequisite:** Phase 1 (VirtualFS) + Phase 2 or 4 (must have real `dist/`).
> **Estimated duration:** 1 week
> **Result:** A Deploy button in the IDE that publishes in seconds.

---

## Concept

```
VirtualFS (/dist/)
    ->
DeployAdapter.deploy()
    ->
fetch() to Cloudflare API
    ->
Public URL
```

Everything happens client-side in browser with a Cloudflare API token.

---

## Files to implement

```
packages/frontend/runtime/src/
|- deploy/
|  |- adapters/
|  |  |- cloudflare-pages.ts
|  |  |- cloudflare-workers.ts
|  |  '- base.ts
|  |- deploy-manager.ts
|  '- index.ts
'- types/
   '- deploy.types.ts
```

---

## Key interfaces

### `deploy.types.ts`

```typescript
export interface DeployConfig {
  provider: "cloudflare-pages" | "cloudflare-workers";
  token: string;
  accountId: string;
  projectName?: string;
  branch?: string;
  workerName?: string;
  distDir: string;
}

export interface DeployResult {
  success: boolean;
  url?: string;
  deploymentId?: string;
  error?: string;
  duration: number;
  filesUploaded: number;
}

export type DeployProgressCallback = (
  phase: "preparing" | "uploading" | "deploying" | "done",
  percent: number,
  message?: string,
) => void;

export interface IDeployAdapter {
  deploy(
    files: Record<string, Uint8Array | string>,
    config: DeployConfig,
    onProgress?: DeployProgressCallback,
  ): Promise<DeployResult>;
}
```

---

## Step-by-step implementation

### Step 1 - adapter base file collection

- Collect all files recursively from `distDir` in VirtualFS.
- Convert to path map relative to `distDir`.

Example:

`/dist/index.html` -> `/index.html`

---

### Step 2 - Cloudflare Pages adapter

Responsibilities:

- Ensure project exists (create if missing).
- Build `FormData` payload with manifest + blobs.
- Call Pages deployment API.
- Return deployment URL and metadata.

Implementation notes:

- Use SHA hash for manifest keys.
- Keep progress callbacks at each phase.
- Map MIME type by extension for upload blobs.

---

### Step 3 - Cloudflare Workers adapter

Responsibilities:

- Find worker entry (`worker.js`, `_worker.js`, or fallback).
- Upload module worker payload using Workers API.
- Return workers.dev URL when successful.

---

### Step 4 - `deploy-manager.ts`

Responsibilities:

- Collect dist files from VirtualFS.
- Fail fast when dist is empty.
- Choose provider adapter.
- Delegate deploy with progress callback.

---

## Web app integration

Deploy panel fields:

- token
- accountId
- projectName (or workerName)
- provider

Panel behavior:

- show live progress,
- show final URL on success,
- show API error details on failure.

---

## Security notes

- Never persist Cloudflare token in localStorage or VirtualFS.
- For production/multi-user setups, route deploy through backend/worker and store secrets server-side.
- For local/dev personal usage, in-memory token entry is acceptable.

---

## Acceptance criteria for "Phase 5 complete"

- [ ] Static app deploys to Cloudflare Pages from browser in < 30s.
- [ ] Returned URL is public and working.
- [ ] Cloudflare API errors are shown clearly.
- [ ] Workers adapter can upload a valid worker entry.
- [ ] Deploy panel is visible and usable in web app.
- [ ] Runtime exports are updated.

---

## Testing guidance

- Unit test empty-dist fail path.
- Mock Cloudflare API responses.
- Test provider switch logic.
- Validate progress callback ordering.
