---
title: System overview
description: How Vertex shares an editor without collapsing its products into one application.
---

```text
apps/web -----------+
                    +--> @vertex/ui --> @vertex/editor-core
apps/desktop -------+         |
                              +--> @vertex/ide-ui
                              +--> @vertex/core

apps/web --------------------------> @vertex/runtime

@vertex/web-editor ----------------> @vertex/editor-core
```

The packages form three layers:

1. Editing primitives in `@vertex/editor-core`.
2. Reusable Angular workbench presentation and services.
3. Product applications that choose browser or native platform adapters.

`@vertex/runtime` is browser-oriented but Angular-free. It owns filesystem,
Git, build, preview, and deployment adapters. The embedded editor must never
import it.

See the repository's
[architecture document](https://github.com/Andersseen/vertex/blob/main/docs/ARCHITECTURE.md)
for the complete dependency diagram and invariants.
