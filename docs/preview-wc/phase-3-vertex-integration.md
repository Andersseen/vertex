# Phase 3 — Vertex IDE integration

> **Goal:** Replace the placeholder `PreviewPanelComponent` with a real Angular component that uses `WebContainerPreview` to run the user's project inside the IDE. Also set the `COOP/COEP` headers on `apps/web` so WebContainers actually works.
>
> **Prerequisite:** Phase 2 complete (`@vertex/runtime/preview-wc` usable).
>
> **Estimated effort:** 2–3 days.

---

## Session prompt

> You are continuing the Vertex IDE monorepo work. The goal of this session is **Phase 3 — Vertex IDE integration** as described in [docs/preview-wc/phase-3-vertex-integration.md](../preview-wc/phase-3-vertex-integration.md). Read that file and the other phase docs for context. Phases 1 and 2 have landed: `@vertex/runtime/preview-wc-headless` and `@vertex/runtime/preview-wc` both exist. In this session you rebuild the Angular PreviewPanelComponent on top of them and set the COOP/COEP headers so WebContainers works. All typecheck / lint / tests must pass at the end and preview must actually render a real Angular or React project in the iframe.

---

## Prerequisites

- Phase 2 merged: `@vertex/runtime/preview-wc` ships `WebContainerPreview`.
- Access to a sample real project to test with (Angular + Tailwind 4 SPA, a Vite React, ideally an Astro SSG if available).

---

## What changes in `apps/web`

### 1. COOP / COEP headers

WebContainers requires `SharedArrayBuffer`, which requires cross-origin isolation.

**In production (Cloudflare Pages):** create `apps/web/public/_headers`:

```
/*
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin
```

**In dev (`bun web:dev` / Vite):** Vite config needs a middleware that sends the same headers. Edit `apps/web/vite.config.ts`:

```ts
server: {
  headers: {
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
  },
  ...
},
preview: {
  headers: {
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
  },
},
```

### 2. Audit cross-origin resources

After setting these headers, do a full pass through `apps/web`:

- Grep for `fonts.googleapis.com`, `fonts.gstatic.com` → Google's CDN sends CORP, works.
- Grep for any `<link rel=` / `<script src=` / `<img src=` pointing to external hosts.
- For each, check the response headers contain `Cross-Origin-Resource-Policy: cross-origin`. If missing:
  - Self-host the asset (preferred), or
  - Proxy via a tiny Cloudflare Worker that adds the header.

Typical breakage points:
- GitHub avatar URLs (if used) — actually they send CORP.
- Third-party iconfonts, analytics scripts, embedded Figma/YouTube/Stripe widgets — unlikely in an IDE but check.
- Any Cloudflare Insights / Web Analytics snippet.

If too many things break with `require-corp`, fall back to `Cross-Origin-Embedder-Policy: credentialless`. It's more permissive (cross-origin resources load without cookies) and still enables SharedArrayBuffer. Document whichever you pick.

### 3. Rebuild `PreviewPanelComponent`

Replace the placeholder with the real component. High-level shape:

```ts
import { Component, ChangeDetectionStrategy, input, signal, inject,
         OnDestroy, ViewChild, ElementRef, effect, untracked } from '@angular/core'
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'
import { WebContainerPreview } from '@vertex/runtime/preview-wc'
import type { PreviewSession, PreviewConfig, RunnerLog, RunnerPhase }
  from '@vertex/runtime/preview-wc'
import type { IVirtualFS } from '@vertex/runtime'

@Component({ selector: 'app-preview-panel', standalone: true, ... })
export class PreviewPanelComponent implements OnDestroy {
  readonly virtualFs = input<IVirtualFS | null>(null)

  @ViewChild('previewFrame')
  private frameRef?: ElementRef<HTMLIFrameElement>

  private preview: WebContainerPreview | null = null
  private session: PreviewSession | null = null

  readonly isRunning = signal(false)
  readonly isBusy = signal(false)
  readonly statusLabel = signal<string>('')
  readonly errorMessage = signal<string | null>(null)
  readonly logs = signal<string[]>([])
  readonly showLogs = signal(false)
  readonly joinedLogs = signal<string>('')

  async togglePreview(): Promise<void> { ... }

  private async startPreview(): Promise<void> {
    const fs = this.virtualFs()
    const iframe = this.frameRef?.nativeElement
    if (!fs || !iframe) return

    this.preview = new WebContainerPreview(iframe, { fs })
    this.session = await this.preview.start({
      onPhase: (phase, msg) => this.statusLabel.set(phaseLabel(phase, msg)),
      onLog: (log) => this.pushLog(log.chunk),
    })
  }

  private async stopPreview(): Promise<void> { ... }
}
```

Reuse the UI shell from the old Nodebox-era component (button, status, Logs panel, iframe). The core is the same; only the internals change.

### 4. Wire the runner's VFS

The `WebContainerPreview` takes `runnerOptions`. Pass `{ fs: this.virtualFs() }` so it mirrors the user's files into the WebContainer. Everything the user edited in the file tree is picked up.

For live-edit propagation (changes in the editor reflected into the WebContainer without restart), that's **not scope for Phase 3**. Add it later as an enhancement once the basic preview is solid.

### 5. Update exports in package.json of the web app if needed

No changes needed typically. Double-check that `@vertex/runtime/preview-wc` is pre-bundled by the `vertex-runtime-subpaths` Vite plugin (Phase 2 added it); same for `preview-wc-headless`.

---

## Steps

1. **Set headers.** Add the Vite dev-server headers and the Pages `_headers` file. Run `bun web:dev` and visit `localhost:4200`; open DevTools → Network → pick any request → Response Headers → confirm the two headers are present.
2. **Verify `crossOriginIsolated`.** In the browser console: `crossOriginIsolated` → must be `true`. If `false`, something is loading that doesn't have CORP; fix the offending resource.
3. **Audit external resources.** As described above.
4. **Rebuild PreviewPanelComponent** against `WebContainerPreview`.
5. **Manual smoke tests:** clone a Vite React project into Vertex, click Run Preview, see the app render. Then try an Angular + Tailwind 4 project, then an Astro SSG if available.
6. **Lint + typecheck + test.** All green.

---

## Acceptance criteria

- [ ] `crossOriginIsolated === true` in production build and dev server.
- [ ] `bun --cwd apps/web check-types` passes.
- [ ] `bun --cwd apps/web lint` passes.
- [ ] `bun --cwd packages/frontend/runtime test` passes.
- [ ] Cloning and previewing a Vite React + Tailwind project works end-to-end.
- [ ] Cloning and previewing an Angular + Tailwind 4 project works end-to-end.
- [ ] Cloning and previewing an Astro SSG project works end-to-end.
- [ ] Log panel shows install + dev-server output in real time.
- [ ] "Stop" tears down the WebContainer cleanly (verified by reopening a second preview — no stale state).

---

## Risks

- **Angular zoneless + WebContainer iframe**: Angular zoneless uses effects/signals. The iframe is a cross-origin doc — no direct interaction needed, so this is fine.
- **Memory**: WebContainer + Angular IDE + the preview iframe can chew 1–2 GB of RAM. Document this.
- **Coldstart**: first WebContainer boot in a session takes ~3–5 s plus the `npm install` of the project (20 s–3 min). Show clear phases so it doesn't feel frozen.
- **COOP/COEP gotcha**: if any existing Vertex feature (ex: future OAuth popup for Git) needs `window.opener`, `COOP: same-origin` kills that. Plan around it before merging.

---

## Commit strategy

- Commit 1: headers + Vite config + `_headers` file.
- Commit 2: rebuild `PreviewPanelComponent`.
- Commit 3: audit fixes for any CORP-breaking assets.
