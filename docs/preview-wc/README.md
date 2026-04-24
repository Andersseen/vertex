# `@vertex/runtime/preview-wc` — Plan of work

> **Goal:** Build a production-quality, reusable WebContainer-based preview lib split into two parts — a headless build runner (for Devflare, CI, and any non-UI consumer) and a UI-aware preview wrapper (for Vertex IDE).
>
> **Consumer products:** Vertex IDE (full preview with iframe), Devflare (headless `clone + install + build + deploy`), future tooling.

---

## Why this lib

We have explored the runtime preview options in detail:

- **`preview-lite`** (esbuild-wasm + Service Worker): works for ~30–40% of modern SPAs; breaks on anything with complex Vite plugins, Tailwind 4 beta, framework routing, etc. Archived in git history, will be deleted in Phase 0.
- **`preview-node`** (CodeSandbox Nodebox): unreliable package manager that chokes on modern peer-dep ranges, Tailwind v4, native binaries. Archived in git history, will be deleted in Phase 0.
- **WebContainers** (StackBlitz): real Node-compatible runtime in the browser, handles `npm install` / `pnpm install` / `bun install` correctly, runs real dev servers. Free for personal / non-commercial use; requires `COOP/COEP` headers on the hosting app. **This is the direction going forward.**

No backend compute is required — the whole thing runs in the user's browser. That fits the Vertex browser-only philosophy and also lets Devflare be a pure Cloudflare Pages app with no server.

---

## Architecture

Two subpath exports from `@vertex/runtime`:

```
@vertex/runtime/preview-wc-headless   →  WebContainerRunner
                                           (no DOM assumptions, no iframe)
                                           clone/mount + install + build/dev-server + extract output

@vertex/runtime/preview-wc            →  WebContainerPreview
                                           (uses WebContainerRunner internally)
                                           owns an HTMLIFrameElement, wires dev-server URL into it,
                                           emits PreviewSession compatible with the old UI panel
```

Composition: `WebContainerPreview` depends on `WebContainerRunner`. Devflare depends only on `WebContainerRunner`. Vertex IDE depends on `WebContainerPreview`.

### Shared types

- `PreviewRunnerLog` — `{ stream: 'stdout' | 'stderr'; chunk: string }`
- `PreviewPhase` — `'boot' | 'mount' | 'install' | 'build' | 'dev-server' | 'ready' | 'failed' | 'stopped'`
- `PreviewSession` — `{ url: string; stop(): Promise<void> }` (already exists in `preview.types.ts`)

---

## Phases

Each phase is a self-contained task with its own doc. Tackle one per session.

| Phase | Doc | Depends on | Estimated effort |
|---|---|---|---|
| **0. Cleanup** | [phase-0-cleanup.md](./phase-0-cleanup.md) | — | ½ day |
| **1. Headless Runner** | [phase-1-runner.md](./phase-1-runner.md) | Phase 0 | 3–5 days |
| **2. UI Preview** | [phase-2-preview-ui.md](./phase-2-preview-ui.md) | Phase 1 | 1–2 days |
| **3. Vertex integration** | [phase-3-vertex-integration.md](./phase-3-vertex-integration.md) | Phase 2 | 2–3 days |
| **4. Packaging & distribution (pre-npm)** | [phase-4-packaging.md](./phase-4-packaging.md) | Phase 3 | 1–2 days |
| **5. npm publish** | [phase-5-npm-publish.md](./phase-5-npm-publish.md) | Phase 4 | 1 day |

Total: roughly 2 weeks of focused part-time work.

---

## Final deliverables

After Phase 5 completes:

- `@vertex/runtime/preview-wc` and `@vertex/runtime/preview-wc-headless` are usable from the Vertex monorepo.
- A standalone installable package (either via `npm install github:andersseen/vertex#main`, or a tarball artifact, or a published npm package — see Phase 4 for the pragmatic staging).
- Vertex IDE renders previews for any project WebContainers supports (React, Vue, Svelte, Angular, Astro, Next, SvelteKit, Nuxt, etc.).
- Devflare-ready headless runner that can `git clone + install + build` and hand off `dist/` to the existing `@vertex/runtime/deploy/adapters/*` for deployment.
- CI check: lint, typecheck, tests green across all packages in the monorepo.

---

## Non-goals for this work

To keep scope contained, these are explicitly **out of scope**:

- Server-side rendering / SSR previews. WebContainers runs the dev server in the browser; if the project is SSR-only, the dev server works but deployment options differ. Deployment to SSR hosts (Cloudflare Workers with SSR, Vercel Functions) stays inside `@vertex/runtime/deploy/adapters/*`.
- Offline support. WebContainers bootstrap requires a network call to StackBlitz servers. The lib assumes online.
- Cross-browser testing beyond Chrome/Edge/Firefox evergreen. Safari has partial WebContainers support; accept the current StackBlitz compat matrix.
- Multi-tenant / multi-project concurrent previews in a single page. One WebContainer per page instance.
- Self-hosted alternative backend. If WebContainers licensing changes, we re-evaluate; not something we preemptively abstract over.
