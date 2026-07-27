# @vertex/ui

Angular workbench components shared by the browser and installed Vertex
applications: layouts, editor integration, sidebars, tabs, and related IDE UI.

CodeMirror configuration comes from `@vertex/editor-core`; reusable visual
primitives come from `@vertex/ide-ui`.

Language-server code is intentionally excluded from the root barrel. Import it
explicitly from:

```ts
import { /* LSP exports */ } from "@vertex/ui/lsp";
```

This prevents installed/native surfaces from pulling the browser TypeScript LSP
and its dependencies unless they choose to.

```bash
bun --cwd packages/frontend/ui check-types
bun --cwd packages/frontend/ui lint
```
