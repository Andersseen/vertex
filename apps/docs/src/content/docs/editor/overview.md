---
title: Embeddable editor
description: A focused custom element for editing or displaying code inside another product.
---

`@vertex/web-editor` publishes two custom elements:

| Element | Purpose | Current size budget |
| --- | --- | --- |
| `<vertex-editor>` | Full editable CodeMirror experience | 1250 KiB minified |
| `<vertex-editor-lite>` | Native, read-only code display | 500 KiB minified |

Both use the compact web language profile: JavaScript, TypeScript, HTML, CSS,
and JSON. Language modules load lazily and are cached.

The editor does not include project preview, a file tree, Git, a terminal,
deployment, or Vertex application services.

Use the full element for user input. Prefer the lite element for documentation,
lessons, snippets, and other read-only presentation.
