# Vertex Web App

Main web application for Vertex IDE. Built with **Angular 21**, **Analog.js**, and **Vite**, managed with **Bun**.

This is the complete browser workbench. Unlike `@vertex/web-editor`, it owns
workspace persistence, Git, build, WebContainer preview, and application
session flows.

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
