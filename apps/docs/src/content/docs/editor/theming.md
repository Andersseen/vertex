---
title: Theming
description: Stable host-level styling for the Vertex editor elements.
---

Both elements render their editor internals inside an encapsulated component or
shadow boundary. Style the host and use the supported custom properties:

```css
vertex-editor,
vertex-editor-lite {
  display: block;
  overflow: hidden;
  border: 1px solid #34384a;
  border-radius: 12px;

  --vertex-editor-font-size: 15px;
  --vertex-editor-line-height: 1.6;
  --vertex-editor-touch-font-size: 16px;
}
```

| Custom property | Default | Purpose |
| --- | --- | --- |
| `--vertex-editor-font-size` | `14px` | Editor text size |
| `--vertex-editor-line-height` | `1.5` | Editor line height |
| `--vertex-editor-touch-font-size` | `16px` | Text size for coarse pointers |

Use the `theme="dark"` or `theme="light"` API for CodeMirror colors. Internal
CodeMirror selectors are not part of the stable public contract.
