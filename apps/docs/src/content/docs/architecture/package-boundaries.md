---
title: Package boundaries
description: Dependency rules that keep the editor reusable and the workbenches composable.
---

The automated boundary check enforces these invariants:

1. `@vertex/editor-core` has no Angular or product dependencies.
2. `@vertex/runtime` has no Angular dependencies.
3. `@vertex/web-editor` does not import workbench or runtime packages.
4. `@vertex/types` remains implementation-independent.
5. Applications compose packages; packages never import applications.

Run the check locally:

```bash
bun run check:boundaries
```

## Where new code belongs

| Capability | Owner |
| --- | --- |
| CodeMirror configuration shared by surfaces | `@vertex/editor-core` |
| Public custom-element behavior | `@vertex/web-editor` |
| Reusable IDE visual primitive | `@vertex/ide-ui` |
| Angular workbench component | `@vertex/ui` |
| Angular application service or adapter token | `@vertex/core` |
| Browser filesystem, Git, build, preview, deploy | `@vertex/runtime` |
| Native bridge implementation | `apps/desktop/src-tauri` |
| Product workflow and routing | owning application |
