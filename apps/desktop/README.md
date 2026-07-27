# Vertex Installed App

Installed Vertex workbench built with Angular 21, Tauri, and Rust.

It shares editor and workbench behavior with the web product, then supplies
native filesystem, process, terminal, window, and lifecycle adapters. Preview
is optional here and is never part of the shared editor contract.

## Product boundary

- TypeScript owns product state, commands, and editor behavior.
- Rust owns native capabilities and narrow platform bridges.
- UI code depends on typed adapter contracts rather than checking Tauri
  globals throughout components.
- Native implementations should replace shared TypeScript logic only when
  profiling or a platform requirement justifies it.

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

- The desktop app shares frontend packages (`@vertex/core`, `@vertex/ui`,
  `@vertex/ide-ui`, `@vertex/editor-core` transitively through `@vertex/ui`).
- The terminal backend connects via WebSocket to `packages/backend/terminal`.
- The filesystem sidecar connects to `packages/backend/sidecar`.

The current sidecars and adapter wiring are transitional foundations. The
target architecture is one typed platform-adapter contract followed by removal
of obsolete duplicate terminal implementations.

## Tablet target

Responsive CSS is only the baseline. Before calling tablet support stable,
validate on physical hardware:

- hardware and virtual keyboard transitions;
- touch selection and coarse-pointer targets;
- safe areas and orientation changes;
- suspend/resume and filesystem permission recovery;
- editor state preservation during lifecycle changes.

See [`AGENTS.md`](../../AGENTS.md) for project conventions.
See [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) for product boundaries.
