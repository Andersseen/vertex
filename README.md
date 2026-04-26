# Vertex

Vertex is an open source IDE platform built with Angular, Tauri, Bun, and CodeMirror 6.

It contains:

- A desktop IDE app (Tauri + Angular)
- A web app
- A reusable web editor package
- Frontend and backend packages in a Bun/Turbo monorepo

## Status

Active development.

## Monorepo Layout

```text
apps/
  desktop/           # Tauri desktop app
  web/               # Analog/Angular web app
  web-editor-demo/   # Demo app for web editor
packages/
  frontend/
    core/
    ide-ui/
    runtime/
    types/
    ui/
    web-editor/
  backend/
    sidecar/
    terminal/
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

Install the standalone web component into any project:

```bash
curl -fsSL https://raw.githubusercontent.com/andersseen/vertex/main/scripts/install.mjs | node - ./public
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
