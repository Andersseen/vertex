# Phase 0 — Cleanup

> **Goal:** Remove dead preview code (`preview-lite`, `preview-node`, Nodebox `node/`) and wire a minimal placeholder so the monorepo still builds while we prepare for WebContainers.
>
> **Estimated effort:** ½ day
>
> **Why this phase exists:** we agreed that keeping archived code "just in case" is a form of procrastination. Git history keeps everything recoverable. Starting WebContainer integration on top of a clean slate is faster than replacing two layers in parallel.

---

## Session prompt

> You are continuing the Vertex IDE monorepo work. The goal of this session is **Phase 0 — Cleanup** as described in [docs/preview-wc/phase-0-cleanup.md](../preview-wc/phase-0-cleanup.md). Read that file and [docs/preview-wc/README.md](../preview-wc/README.md) for context. Follow the steps exactly; do not start Phase 1 work. At the end, typecheck + lint + test must pass across the monorepo.

---

## Prerequisites

- Nothing. This is the starting point.
- Confirm the current branch is safe to modify (no in-flight PR that depends on `preview-lite` or `preview-node`).

---

## What gets deleted

### From `packages/frontend/runtime/src/`

- `preview-lite/` — entire directory (manager, SW, template, html-index, hot-reload).
- `preview-node/` — entire directory.
- `node/` — keep **only if** you want to retain NodeboxRuntime for future experiments; otherwise delete too. Recommended: **delete**. Rationale in the README.
- Types in `types/preview.types.ts` that are exclusive to the old paths: `PreviewNodeConfig`, `PreviewNodePhase`, SW message types (`SWMessage`, `SWResponse`). `PreviewConfig` and `PreviewSession` **stay** — they are useful as the basic session shape that Phase 2 will reuse.

### From `packages/frontend/runtime/package.json`

- `"./preview-lite"` export → remove.
- `"./preview-node"` export → remove.
- `"./node"` export → remove (if the `node/` dir is deleted).
- `"@codesandbox/nodebox"` dep → remove.

### From `packages/frontend/runtime/src/index.ts`

- Re-exports of `PreviewConfig`, `PreviewSession`, `IPreviewManager`, `SWMessage`, `SWResponse` → trim to only what survives (`PreviewConfig`, `PreviewSession`).
- Remove `PreviewNodeConfig`, `PreviewNodePhase` from the `export type { … }` line.

### From `apps/web/vite.config.ts`

- `RUNTIME_SUBPATHS` entries for `@vertex/runtime/preview-lite`, `@vertex/runtime/preview-node`, `@vertex/runtime/node` → remove.

### From `apps/web/tsconfig.json`

- Path mappings for `@vertex/runtime/preview-lite`, `@vertex/runtime/preview-node`, `@vertex/runtime/node` → remove.

### In `apps/web/src/app/components/preview-panel/preview-panel.component.ts`

Replace the component body with a **minimal placeholder** that:

- Shows a disabled "Run Preview" button.
- Shows a helper message like _"Preview engine is being upgraded. Check back after Phase 1–2 of preview-wc lands."_
- Still accepts the `virtualFs` input so the rest of the workspace (file tree, editor, etc.) keeps working.
- Does **not** import from `@vertex/runtime/preview-*` or `@vertex/runtime/node` so those imports no longer exist in the tree.

This keeps the IDE functional during Phases 1–3 even though preview doesn't work.

---

## Steps

1. **Branch off.** `git checkout -b preview-wc/phase-0-cleanup`.
2. **Delete source directories.** `rm -rf packages/frontend/runtime/src/preview-lite packages/frontend/runtime/src/preview-node packages/frontend/runtime/src/node`.
3. **Trim `preview.types.ts`.** Keep `PreviewConfig`, `PreviewSession`, `IPreviewManager`. Delete `PreviewNodeConfig`, `PreviewNodePhase`, `SWMessage`, `SWResponse`.
4. **Trim `src/index.ts`.** Only re-export `PreviewConfig`, `PreviewSession`, `IPreviewManager` from the preview types.
5. **Edit `package.json`.** Remove the three subpath exports and the Nodebox dep.
6. **Run `bun install`** to refresh the lockfile.
7. **Edit `tsconfig.json`** exclude rule: remove the `src/preview-lite/service-worker/sw.ts` exclusion, since that file is gone.
8. **Edit `apps/web/vite.config.ts`** to drop the removed subpaths.
9. **Edit `apps/web/tsconfig.json`** to drop the removed path mappings.
10. **Rewrite `PreviewPanelComponent`** as a placeholder (see template below).
11. **Typecheck + lint + test:**
    - `bun --cwd packages/frontend/runtime check-types`
    - `bun --cwd packages/frontend/runtime test`
    - `bun --cwd apps/web check-types`
    - `bun --cwd apps/web lint`
12. **Commit with a single message**: `chore(runtime): drop preview-lite, preview-node, node (Phase 0 cleanup)`.

---

## Placeholder component template

```ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import type { IVirtualFS } from '@vertex/runtime';

@Component({
  selector: 'app-preview-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="preview-placeholder">
      <p>
        Preview engine is being upgraded to WebContainers.
        Functionality returns in phase 2 of the preview-wc plan.
      </p>
    </div>
  `,
  styles: `
    .preview-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--ide-text-muted, #888);
      font-size: 13px;
      text-align: center;
      padding: 24px;
    }
  `,
})
export class PreviewPanelComponent {
  readonly virtualFs = input<IVirtualFS | null>(null);
}
```

---

## Acceptance criteria

- `rg 'preview-lite|preview-node|nodebox' packages apps` returns zero hits in source files (ignore `dist/` and `.md` references).
- `bun --cwd packages/frontend/runtime check-types` passes.
- `bun --cwd packages/frontend/runtime test` passes (tests that referenced preview-lite/node should be deleted too).
- `bun --cwd apps/web check-types` passes.
- `bun --cwd apps/web lint` passes.
- Running `bun web:dev` and opening `localhost:4200` still works; the preview panel shows the placeholder message.

---

## Risks / things to double-check

- `@vertex/core` or `@vertex/types` may import preview types. Grep before deleting and adjust.
- The Angular build for `apps/web` caches aggressively — clear `node_modules/.vite` if typecheck passes but runtime errors appear.
- The SW file `apps/web/public/vertex-sw.js` is a precompiled output of `preview-lite`; it becomes dead weight. **Delete it** to avoid confusion.
