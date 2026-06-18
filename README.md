# Vertex

Vertex is an open source IDE platform built with Angular, Tauri, Bun, and CodeMirror 6. It runs in the browser, on the desktop, and as an embeddable web component.

It contains:

- A desktop IDE app (Tauri + Angular)
- A web app (Angular + Analog.js + Vite)
- Reusable web components: `<vertex-editor>` (full editable) and `<vertex-editor-lite>` (read-only display)
- A browser-native runtime (VirtualFS, Git, esbuild-wasm bundler, WebContainers preview, Cloudflare deploy)
- Frontend and backend packages in a Bun/Turbo monorepo

## Status

Active development — Phase 2 (browser build, preview, and deploy) is in progress.

## Monorepo Layout

```text
apps/
  desktop/           # Tauri desktop app
  web/               # Analog/Angular + Vite web app
  web-editor-demo/   # Demo app for web editor
packages/
  frontend/
    core/              # Angular services, Dexie DB, terminal adapter
    ide-ui/            # Headless IDE UI components
    runtime/           # Browser-native runtime (FS, Git, build, preview, deploy)
    types/             # Shared types
    ui/                # Layouts, CodeMirror editor, sidebar
    web-editor/        # Publishable <vertex-editor> web component
  backend/
    sidecar/           # Bun/Hono filesystem sidecar
    terminal/          # Node.js + node-pty terminal sidecar
    core/              # (experimental) shared terminal types/manager/router
scripts/
```

## Requirements

- Bun 1.3.11+
- Node.js 18+
- Rust toolchain (for Tauri desktop development)

## Quick Start

```bash
bun install
bun run dev
```

Useful commands:

```bash
bun run lint
bun run check-types
bun test
bun run build
```

## Web Editor One-Liner Install

Install the standalone `<vertex-editor>` web component into any project:

```bash
curl -fsSL https://raw.githubusercontent.com/Andersseen/vertex/main/scripts/install.mjs | node - ./public
```

Basic usage:

```html
<script src="web-editor.min.js"></script>
<vertex-editor
  value="const x = 1;"
  language="typescript"
  theme="dark"
></vertex-editor>
```

More details: [packages/frontend/web-editor/README.md](packages/frontend/web-editor/README.md)

## Documentation

- Main web app docs: [apps/web/README.md](apps/web/README.md)
- Desktop app docs: [apps/desktop/README.md](apps/desktop/README.md)
- Runtime docs: [packages/frontend/runtime/README.md](packages/frontend/runtime/README.md)
- Preview WC docs: [docs/preview-wc/README.md](docs/preview-wc/README.md)

## Open Source Project Policies

- Contributing guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Code of conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- Security policy: [SECURITY.md](SECURITY.md)
- Support guide: [SUPPORT.md](SUPPORT.md)
- License: [LICENSE](LICENSE)

## License

MIT. See [LICENSE](LICENSE).
