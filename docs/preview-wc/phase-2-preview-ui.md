# Phase 2 — UI-aware `WebContainerPreview`

> **Goal:** Implement `@vertex/runtime/preview-wc` on top of the headless runner from Phase 1. Owns the iframe, wires the dev-server URL into it, emits log/phase events, provides a clean `start/stop` API compatible with the existing `PreviewSession` shape.
>
> **Prerequisite:** Phase 1 complete and manually verified.
>
> **Estimated effort:** 1–2 days.
>
> **Consumer:** Vertex IDE's `PreviewPanelComponent` will use this in Phase 3. Devflare will **not** use this (it uses the headless runner directly).

---

## Session prompt

> You are continuing the Vertex IDE monorepo work. The goal of this session is **Phase 2 — WebContainerPreview UI wrapper** as described in [docs/preview-wc/phase-2-preview-ui.md](../preview-wc/phase-2-preview-ui.md). Read that file, [docs/preview-wc/README.md](../preview-wc/README.md) and [docs/preview-wc/phase-1-runner.md](../preview-wc/phase-1-runner.md) for context. Phase 1 has landed (`@vertex/runtime/preview-wc-headless` exists and is tested). In this session you build the UI wrapper. Do not touch the Angular PreviewPanel yet — that's Phase 3. All typecheck / lint / tests must pass at the end.

---

## Prerequisites

- Phase 1 merged: `@vertex/runtime/preview-wc-headless` works and has passing tests.
- Confirm you can manually boot the runner against a real project (from Phase 1 acceptance criteria).

---

## Scope

Create a new subpath:

```
packages/frontend/runtime/src/
└── preview-wc/
    ├── index.ts
    ├── webcontainer-preview.ts          ← the main class
    ├── iframe-binder.ts                  ← helper to wire URL → iframe
    └── __tests__/
        └── iframe-binder.spec.ts
```

No Angular code here either — just DOM APIs (`HTMLIFrameElement`). Framework-agnostic.

---

## Public API

```ts
// webcontainer-preview.ts
import type {
  WebContainerRunner,
  RunnerOptions,
  RunnerLog,
  RunnerPhase,
  DevServer,
} from '../preview-wc-headless'

export type PreviewPhase = RunnerPhase

export interface PreviewConfig {
  /** npm script to run as dev server. Defaults to auto-detect: `dev` → `start` → `serve`. */
  devScript?: string

  /** Skip install if node_modules was cached and mounted separately. */
  skipInstall?: boolean

  /** Reuse an existing runner instead of constructing one internally. */
  runner?: WebContainerRunner

  onPhase?: (phase: PreviewPhase, message?: string) => void
  onLog?: (log: RunnerLog) => void
}

export interface PreviewSession {
  url: string
  /** Reloads the iframe. */
  reload(): void
  /** Stops the dev server + WebContainer. */
  stop(): Promise<void>
}

export class WebContainerPreview {
  constructor(
    private readonly iframe: HTMLIFrameElement,
    private readonly runnerOptions: RunnerOptions,
  )

  /** Boot runner (if not already), detect dev script, start dev server, point iframe at it. */
  async start(config?: PreviewConfig): Promise<PreviewSession>

  async stop(): Promise<void>

  isRunning(): boolean
}
```

Design choices:

- Takes the `HTMLIFrameElement` in the constructor. Caller owns the element; the wrapper just sets `.src`. This keeps us framework-agnostic (Angular, React, Svelte, plain HTML can all create an iframe and hand it over).
- Accepts either `runnerOptions` (to construct one internally) or a pre-built `runner` (for the headless consumer that wants to reuse). Only one of the two should be provided; validate in the constructor.
- `PreviewSession` returned mirrors the existing shape so the old PreviewPanel stays compatible.

---

## Implementation notes

### Auto-detect dev script

If `config.devScript` is not provided, read `package.json` from the WebContainer FS and pick `dev` → `start` → `serve`. Same logic as the deleted `detectDevScript` helper in the old `@vertex/runtime/build/resolver.ts`. Port it locally into `preview-wc/` so we don't reintroduce dead exports.

### Flow

```ts
async start(config: PreviewConfig = {}): Promise<PreviewSession> {
  const runner = config.runner ?? new WebContainerRunner(this.runnerOptions)

  if (!runner.isRunning()) {
    await runner.boot()
  }

  if (!config.skipInstall) {
    const result = await runner.install()
    if (result.exitCode !== 0) throw new Error(`install exited ${result.exitCode}`)
  }

  const script = config.devScript ?? (await this.detectDevScript(runner))
  if (!script) {
    throw new Error(
      'No dev script found. Expected one of dev/start/serve in package.json',
    )
  }

  const devServer = await runner.startDevServer(script)

  this.iframe.src = devServer.url
  this.running = true

  return {
    url: devServer.url,
    reload: () => { this.iframe.contentWindow?.location.reload() },
    stop: () => this.stop(),
  }
}
```

### Event wiring

`runnerOptions.onPhase` and `onLog` passed in should chain from the wrapper's own `config.onPhase` / `config.onLog`. Merge them: if the caller passes both runner-level and preview-level listeners, both fire. Simplest: `onPhase` on `runnerOptions` calls `config.onPhase` too.

### Iframe sandboxing

Caller is responsible for setting the iframe's `sandbox` attribute. Recommended value for Vertex: `allow-scripts allow-same-origin allow-forms allow-modals allow-popups`. Document this in JSDoc on the constructor.

### Testing `iframe-binder`

`iframe-binder.ts` exports a tiny helper `bindUrl(iframe, url)`. Test with `jsdom` or by constructing a fake `{ src: '' }` stub.

---

## Package wiring

### `packages/frontend/runtime/package.json`

```json
"./preview-wc": {
  "import": "./src/preview-wc/index.ts",
  "types": "./src/preview-wc/index.ts"
}
```

### `apps/web/vite.config.ts`

Add to `RUNTIME_SUBPATHS`:

```ts
'@vertex/runtime/preview-wc':
  path.join(runtimeSrc, 'preview-wc/index.ts'),
```

### `apps/web/tsconfig.json`

```json
"@vertex/runtime/preview-wc": [
  "../../packages/frontend/runtime/src/preview-wc/index.ts"
]
```

---

## Acceptance criteria

- [ ] `bun --cwd packages/frontend/runtime check-types` passes.
- [ ] `bun --cwd packages/frontend/runtime test` passes (new unit tests green).
- [ ] `bun --cwd apps/web check-types` passes.
- [ ] `import { WebContainerPreview } from '@vertex/runtime/preview-wc'` resolves from `apps/web`.
- [ ] The wrapper has no Angular imports.
- [ ] A short manual harness (can be an `examples/` html file or a scratch Angular component that you delete) proves end-to-end: create iframe, instantiate `WebContainerPreview`, point it at a cloned Vite React repo, see the app render in the iframe.

---

## Commit strategy

- Commit 1: types + `iframe-binder.ts` + tests.
- Commit 2: `webcontainer-preview.ts` + `index.ts` + package/tsconfig/vite wiring.
- Commit 3 (optional): a manual-harness example under `examples/preview-wc/` if you want it in the repo.
