# Vertex Browser Workbench

The complete Vertex project workflow that runs in a browser. It is built with
Angular 21, Analog.js, and Vite.

Unlike the embeddable `<vertex-editor>`, this application owns repositories,
workspace persistence, browser Git, build, WebContainer preview, deployment,
and session recovery.

## Product boundary

This app composes:

- `@vertex/ui` and `@vertex/ide-ui` for the workbench;
- `@vertex/core` for Angular services and platform adapters;
- `@vertex/runtime` for browser filesystem, Git, build, preview, and deploy;
- `@vertex/editor-core` transitively through the shared editor UI.

Application workflows and routes belong here. Reusable editor configuration
belongs in `@vertex/editor-core`; generic browser runtime logic belongs in
`@vertex/runtime`.

## Development

```bash
# Vite dev server → http://localhost:5173
bun web:dev

# Production build
bun web:build

# Preview the build
bun --cwd apps/web preview
```

## Tests

```bash
# Unit tests (Bun)
bun web:test

# E2E (Playwright)
bun test:e2e
bun test:e2e:ui
```

The tablet Playwright project covers the responsive/touch baseline. Physical
iPad validation is still required for hardware keyboards, IME, virtual
keyboard behavior, orientation, and suspend/resume.

## Required browser capabilities

Capabilities are independent:

- OPFS/IndexedDB for persistent repositories;
- cross-origin isolation for WebContainers;
- browser support required by isomorphic-git and esbuild-wasm.

New flows must degrade clearly when one capability is unavailable and must not
discard editor content.

## Deploy

```bash
bun web:deploy
```

Deploys to Cloudflare Pages (`dist/client` via Wrangler).

## Structure

```
apps/web/src/app/
  routes/          # Analog.js file-based routes
  components/      # App-specific components
  services/        # App-specific services
  editor/          # Main editor
  landing/         # Landing page
  demos/           # Demo pages
```

## Stack

- Angular 21 (zoneless, signals, standalone)
- Analog.js (file-based routing)
- Vite
- CodeMirror 6
- xterm.js
- Bun 1.3.11

See [`AGENTS.md`](../../AGENTS.md) for project conventions.
See [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) for package ownership.
