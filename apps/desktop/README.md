# Vertex Desktop App

Desktop application for Vertex IDE. Built with **Angular 21**, **Tauri**, and **Rust**, managed with **Bun**.

## Development

Requirements: Rust + Cargo installed.

```bash
# Tauri development
bun desktop:dev

# Production build
bun desktop:build

# Debug build
bun desktop:build:debug
```

## Structure

```
apps/desktop/
  src/                # Angular app code
  src-tauri/          # Rust code + Tauri configuration
  angular.json        # Angular CLI configuration
```

## Stack

- Angular 21 (zoneless, signals, standalone)
- Tauri 2.x
- Rust
- Bun 1.3.11

## Notes

- The desktop app shares frontend packages (`@vertex/core`, `@vertex/ui`, `@vertex/ide-ui`, `@vertex/runtime`).
- The terminal backend connects via WebSocket to `packages/backend/terminal`.
- The filesystem sidecar connects to `packages/backend/sidecar`.

See [`AGENTS.md`](../../AGENTS.md) for project conventions.
