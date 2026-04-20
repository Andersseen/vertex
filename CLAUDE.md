# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Turborepo + Bun (`bun@1.3.11`) monorepo. Web/desktop IDE with virtual filesystem in the browser (OPFS + IndexedDB) and browser-native git.

```
apps/
  web/          → Angular 21 main app (ng serve → localhost:4200)
  desktop/      → Tauri + Rust
  web-editor-demo/ → standalone web component demo
packages/
  frontend/
    ide-ui/     → @vertex/ide-ui — IDE components (headless + CSS custom props)
    ui/         → @vertex/ui — layouts, CodeMirror editor, sidebar
    runtime/    → @vertex/runtime — VirtualFS + GitClient (browser)
    core/       → @vertex/core — Angular services (RuntimeService, PreferencesService, Dexie DB)
    types/      → @vertex/types — shared types
    web-editor/ → @vertex/web-editor — Angular Element standalone (publishable web component)
  backend/
    terminal/   → @vertex/terminal-sidecar — Node.js + node-pty
    sidecar/    → Rust sidecar for Tauri
```

---

## Commands

```bash
# Development
bun web:dev                          # Angular dev server → localhost:4200
bun dev:all                          # web + terminal sidecar + rust sidecar in parallel
bun desktop:dev                      # Tauri desktop (requires Rust + Cargo)

# Build
bun build                            # full build via Turbo (respects dependencies)
bun web:build                        # Angular web app only
bun web-editor:build                 # web component (esbuild bundle → dist/web-editor-aot.min.js)

# Lint and types
bun lint                             # turbo lint (all packages)
bun lint:fix                         # lint with --fix
bun check-types                      # turbo typecheck (all packages)
bun --cwd packages/frontend/<pkg> check-types  # typecheck a single package

# Tests
bun test                             # turbo test (unit)
bun test:e2e                         # Playwright e2e (apps/web)
bun test:e2e:ui                      # Playwright with UI

# Deploy
bun web:deploy                       # ng build + wrangler pages deploy → Cloudflare Pages

# Web editor demo
bun web-editor-demo:start            # build web-component + serve demo
```

---

## Angular selectors

ESLint enforces `v-` prefix (components, kebab-case) and `v` prefix (directives, camelCase). Never use `ide-` or `vertex-` as selector prefixes.

```typescript
@Component({ selector: "v-my-component" })   // correct
@Directive({ selector: "[vMyDirective]" })    // correct
@Component({ selector: "ide-foo" })           // lint error
```

---

## Tech stack

**Frontend:**
- Angular 21, **zoneless** (`provideZonelessChangeDetection()`), signals
- CodeMirror 6 (editor), xterm.js (terminal)
- `@andersseen/headless-components` — headless logic for ide-ui
- Quartz UI (`/Users/andriipap/Andersseen/Web/Projects/quartz/`) — custom Angular headless directives, shadcn-style (not on npm, copy into `src/primitives/`). Modules: splitter, dialog, drag-drop, overlay, toast, tooltip, listbox
- CSS custom properties for all theming (`--ide-*` tokens in ide-ui)
- No Tailwind, no PrimeNG

**Backend:**
- Node.js + node-pty for terminal (`packages/backend/terminal/`)
- Rust sidecar (Tauri, `packages/backend/sidecar/`)

---

## Persistence layers

| Layer | Stores | Reason |
|-------|--------|--------|
| `localStorage` | Splitter positions | Sync read, no flash on load |
| `sessionStorage` (key `vertex:editor`) | Open tabs | Intentionally volatile |
| Dexie v4 (`vertex-ide` DB) | Active session, preferences | Structured, extensible |
| OPFS + IndexedDB (Lightning FS) | Cloned repo files | Browser-native filesystem |

To add Dexie tables: `db.version(2).stores({...})` in `packages/frontend/core/src/db/vertex.db.ts`.

---

## Package architecture

```
apps/web (Angular app)
  └── uses @vertex/core, @vertex/ide-ui, @vertex/runtime, @vertex/ui

@vertex/core
  ├── db/vertex.db.ts         → VertexDatabase (Dexie), SessionRecord, PreferenceRecord
  ├── services/               → WorkspaceService, PreferencesService, ConfigService
  ├── fs/                     → FileService, TauriService
  └── terminal/               → TERMINAL_BACKEND_ADAPTER token, VirtualTerminalService, MockTerminalService

@vertex/runtime (browser-only, no Angular)
  ├── fs/    → VirtualFS (abstract), OPFSFS, MemoryFS
  └── git/   → GitClient (isomorphic-git wrapper)

@vertex/ide-ui
  ├── components/             → v-ide-button, v-ide-tabs, v-ide-dialog, v-ide-input, v-ide-layout,
  │                              v-ide-progress-bar, v-ide-splitter, v-ide-toolbar, v-ide-tree, v-ide-alert
  └── primitives/splitter/    → copied from Quartz (do not change directory structure)

@vertex/web-editor (Angular Element, publishable as web component)
  ├── web-editor.component.ts      → <vertex-editor> (full web component)
  └── web-editor-lite.component.ts → display-only, ~500KB vs ~1.6MB
```

The terminal uses **dependency injection** via `TERMINAL_BACKEND_ADAPTER`. In web: `VirtualTerminalService`; in desktop: can connect to node-pty or WebContainers.

---

## Angular patterns — required

```typescript
// Signals-first
readonly count = signal(0);
readonly doubled = computed(() => this.count() * 2);

// input() / output() — not @Input/@Output
readonly value = input<string>('');
readonly valueChange = output<string>();

// inject() — not constructor DI
private readonly service = inject(MyService);

// OnPush always
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })

// Standalone — no NgModules
@Component({ standalone: true, imports: [...] })

// New control flow
@if (condition) { ... }
@for (item of items; track item.id) { ... }

// Never use: ngModel, NgZone, EventEmitter, BehaviorSubject for local state
```

Keep components small. Template >80 lines or class >100 lines → split it.

---

## ide-ui rules

- All styles via CSS custom properties (`var(--ide-*)`), never hardcoded values.
- For complex interactive logic (modal, tabs, splitter): use a primitive from `@andersseen/headless-components` or Quartz.
- To add a new Quartz primitive: copy the module from `/Users/andriipap/Andersseen/Web/Projects/quartz/packages/quartz/src/lib/<module>/` into `packages/frontend/ide-ui/src/primitives/<module>/`.
- Export everything from `packages/frontend/ide-ui/src/index.ts`.

---

## Web Component (`@vertex/web-editor`)

Published as Angular Element. Build uses `ng build` (AOT) + `esbuild` to produce an IIFE bundle at `dist/web-editor-aot.min.js`. Installed via `curl` script or `npx vertex-editor`.

The public custom element selector is `<vertex-editor>`; `v-editor-internal` is the internal Angular selector and must never appear in external templates.

---

## Phase 2 — planned (not started)

Goal: run code in the browser.

```
Phase 2A — Build (esbuild-wasm)        → compile TS/JS in browser
Phase 2B — Preview (SW + iframe)       → Service Worker serves OPFS; hot reload via postMessage
Phase 2C — Node.js Runtime             → WebContainers (needs COOP/COEP headers) or Nodebox
Phase 2D — Deploy (Cloudflare Pages)   → token stored in Dexie preferences
```

Extend `@vertex/runtime`, do not rewrite it:
```
src/
  fs/      exists
  git/     exists
  build/   new — BuildRunner (esbuild-wasm)
  preview/ new — PreviewServer (SW + iframe bridge)
  node/    new — NodeRuntime (WebContainers/Nodebox adapter)
  deploy/  new — DeployService (Cloudflare Pages)
```
