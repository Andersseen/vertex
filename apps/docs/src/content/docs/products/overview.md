---
title: Choose a surface
description: One Vertex editor, delivered through surfaces with different capabilities.
---

Vertex is one code editor with IDE capabilities, expressed through several surfaces.
The [1.0 roadmap](/project/roadmap/) targets JS/TS projects, macOS first for desktop,
and a physically validated iPad browser experience.

| Surface | Primary job | Includes preview? | Native access? |
| --- | --- | --- | --- |
| Browser workbench | Work with complete projects in a browser | Yes, when supported | No |
| Installed app | Work with local projects through platform adapters | Optional | Yes |
| `<vertex-editor>` | Embed code editing in another product | No | No |
| `<vertex-editor-lite>` | Display highlighted, read-only code | No | No |

Choose the smallest surface that owns the capability you need.

The custom elements deliberately do not expose filesystem, Git, terminal,
build, preview, or deployment APIs. Those are workbench concerns.
