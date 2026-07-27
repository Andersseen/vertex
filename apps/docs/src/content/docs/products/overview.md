---
title: Choose a surface
description: Vertex products share editing primitives but solve different jobs.
---

| Surface | Primary job | Includes preview? | Native access? |
| --- | --- | --- | --- |
| Browser workbench | Work with complete projects in a browser | Yes, when supported | No |
| Installed app | Work with local projects through platform adapters | Optional | Yes |
| `<vertex-editor>` | Embed code editing in another product | No | No |
| `<vertex-editor-lite>` | Display highlighted, read-only code | No | No |

Choose the smallest surface that owns the capability you need.

The custom elements deliberately do not expose filesystem, Git, terminal,
build, preview, or deployment APIs. Those are workbench concerns.
