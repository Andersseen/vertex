# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project

Turborepo + Bun (`bun@1.3.11`) monorepo. Web/desktop IDE with virtual filesystem in the browser (OPFS + IndexedDB) and browser-native git.

```
apps/
  web/          → Angular 21 + Analog.js + Vite main app (→ localhost:5173)
  desktop/      → Tauri + Rust
  web-editor-demo/ → standalone web component demo
packages/
  frontend/
    ide-ui/     → @vertex/ide-ui — IDE components (headless + CSS custom props)
    ui/         → @vertex/ui — layouts, CodeMirror editor, sidebar
    runtime/    → @vertex/runtime — VirtualFS + GitClient + Build + Preview + Deploy (browser)
    core/       → @vertex/core — Angular services (RuntimeService, PreferencesService, Dexie DB)
    types/      → @vertex/types — shared types
    web-editor/ → @vertex/web-editor — Angular Element standalone (publishable web component)
  backend/
    terminal/   → @vertex/terminal-sidecar — Node.js + node-pty
    sidecar/    → @vertex/sidecar — Bun/Hono filesystem sidecar
    core/       → (experimental) shared terminal types/manager/router, not yet wired as workspace package
```

---

## Commands

```bash
# Development
bun web:dev                          # Vite dev server → localhost:5173
bun dev:all                          # web + terminal sidecar + rust sidecar in parallel
bun desktop:dev                      # Tauri desktop (requires Rust + Cargo)

# Build
bun build                            # full build via Turbo (respects dependencies)
bun web:build                        # Analog/Vite web app only
bun web-editor:build                 # web component (esbuild bundle → dist/web-editor.min.js)

# Lint and types
bun lint                             # turbo lint (all packages)
bun lint:fix                         # lint with --fix
bun check-types                      # turbo typecheck (all packages)
bun --cwd packages/frontend/<pkg> check-types  # typecheck a single package

# Tests
bun test                             # unit tests (Bun)
bun test:e2e                         # Playwright e2e (apps/web) → localhost:4201
bun test:e2e:ui                      # Playwright with UI

# Deploy
bun web:deploy                       # vite build + wrangler pages deploy → Cloudflare Pages

# Web editor demo
bun web-editor-demo:start            # build web-component + serve demo
```

---

## Angular selectors

ESLint enforces the `v-` prefix (components, kebab-case) and `v` prefix (directives, camelCase) in shared libraries (`@vertex/ui`, `@vertex/ide-ui`, `@vertex/runtime`, `@vertex/web-editor`). Applications (`apps/web`, `apps/desktop`) may use the `app-` prefix for their own components. Never use `ide-` or `vertex-` as selector prefixes in shared packages.

```typescript
@Component({ selector: "v-my-component" })   // correct
@Directive({ selector: "[vMyDirective]" })    // correct
@Component({ selector: "ide-foo" })           // lint error
```

---

## Tech stack

**Frontend:**
- Angular 21, **zoneless** (`provideZonelessChangeDetection()`), signals — see [`ANGULAR_USAGE.md`](./ANGULAR_USAGE.md) for patterns and best practices
- Analog.js (`@analogjs/platform` + `@analogjs/router`) — file-based routing in `apps/web/src/app/routes/` — see [`ANALOGJS_USAGE.md`](./ANALOGJS_USAGE.md) for conventions
- CodeMirror 6 (editor), xterm.js (terminal)
- `@andersseen/headless-components` — headless factory-pattern logic (createButton, createModal, createTabs) for ide-ui
- `quartz-headless` (npm) — Angular headless directives: splitter, tree, overlay, toast, tooltip, drag-drop, virtual-scroll, viewport
- CSS custom properties for all theming (`--ide-*` tokens in ide-ui)
- No Tailwind, no PrimeNG

**Backend:**
- Node.js + node-pty for terminal (`packages/backend/terminal/`)
- Bun/Hono filesystem sidecar (`packages/backend/sidecar/`)
- Rust Tauri bridge (`packages/backend/sidecar/` Tauri code or `apps/desktop/src-tauri`)

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
  ├── git/   → GitClient (isomorphic-git wrapper)
  ├── build/ → Bundler (esbuild-wasm)
  ├── preview-wc/ → WebContainer preview UI
  ├── preview-wc-headless/ → WebContainer runner
  └── deploy/ → Deploy adapters (Cloudflare Pages/Workers)

@vertex/ide-ui
  └── components/             → v-ide-navbar, v-ide-button, v-ide-tabs, v-ide-dialog, v-ide-input,
                                 v-ide-layout, v-ide-progress-bar, v-ide-splitter, v-ide-toolbar,
                                 v-ide-tree, v-ide-alert
                                 (splitter + tree backed by quartz-headless npm package)

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

// Standalone — no NgModules (default in Angular v20+, do not declare standalone: true)
@Component({ imports: [...] })

// New control flow
@if (condition) { ... }
@for (item of items; track item.id) { ... }

// Never use: ngModel, NgZone, EventEmitter, BehaviorSubject for local state
```

Keep components small. Template >80 lines or class >100 lines → split it.

---

## ide-ui rules

- All styles via CSS custom properties (`var(--ide-*)`), never hardcoded values.
- For complex interactive logic (splitter, tree, overlay, toast, tooltip, drag-drop): import from `quartz-headless` npm package.
- For button/tabs/modal headless logic: use `@andersseen/headless-components` (factory-pattern API).
- Export everything from `packages/frontend/ide-ui/src/index.ts`.

Current components: `v-ide-navbar`, `v-ide-button`, `v-ide-tabs`, `v-ide-dialog`, `v-ide-input`, `v-ide-layout`, `v-ide-progress-bar`, `v-ide-splitter`, `v-ide-toolbar`, `v-ide-tree`, `v-ide-alert`, `v-ide-accordion`, `v-ide-accordion-item`, `v-ide-breadcrumb`, `v-ide-context-menu`, `v-ide-drawer`, `v-ide-dropdown`, `v-ide-toast`, `v-ide-tooltip`, `v-ide-virtual-list`.

---

## Web Component (`@vertex/web-editor`)

Published as Angular Element. Build uses `ng build` (AOT) + `esbuild` to produce an IIFE bundle at `dist/web-editor.min.js` (and `dist/web-editor-aot.min.js` alias). Installed via `curl` script or `npx vertex-editor`.

The public custom element selector is `<vertex-editor>`; `v-editor-internal` is the internal Angular selector and must never appear in external templates.

---

## Phase 2 — in progress

Goal: run code in the browser.

```
Phase 2A — Build (esbuild-wasm)        ✅ Bundler exists in @vertex/runtime/build
Phase 2B — Preview (WebContainers)     ✅ WebContainerRunner + preview panel exist
Phase 2C — Node.js Runtime             🔄 WebContainers via preview-wc-headless
Phase 2D — Deploy (Cloudflare Pages)   ✅ CloudflarePagesAdapter + WorkersAdapter exist
```

Extend `@vertex/runtime`, do not rewrite it:
```
src/
  fs/      exists
  git/     exists
  build/   exists — Bundler (esbuild-wasm)
  preview/ exists — PreviewServer/WebContainer integration
  node/    WIP    — NodeRuntime (WebContainers/Nodebox adapter)
  deploy/  exists — DeployService (Cloudflare Pages/Workers)
```
