---
title: Contributing
description: Make changes without weakening Vertex product and package boundaries.
---

Start with the repository
[contribution guide](https://github.com/Andersseen/vertex/blob/main/CONTRIBUTING.md)
and `AGENTS.md`.

Before changing code:

1. Identify the product or package that owns the capability.
2. Keep editor-only behavior outside workbench/runtime packages.
3. Prefer typed platform adapters to environment checks spread through UI.
4. Add a test at the narrowest useful level.
5. Keep public claims aligned with integrated, tested behavior.

Before opening a pull request:

```bash
bun lint
bun run check:boundaries
bun check-types
bun test
bun run build
```

Changes to the web workbench should also run `bun test:e2e`.
