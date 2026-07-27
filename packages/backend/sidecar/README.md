# @vertex/sidecar

Bun/Hono filesystem sidecar for local and installed Vertex development.

```bash
bun sidecar:dev
bun sidecar:build
```

The package compiles to a standalone sidecar binary. It is a platform adapter,
not part of the browser workbench or embeddable editor contract.

Keep transport and filesystem concerns here. Product state and UI workflows
belong in shared TypeScript workbench packages.
