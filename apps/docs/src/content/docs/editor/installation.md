---
title: Installation
description: Install and load the Vertex editor custom elements.
---

## Installer

```bash
npx vertex-editor ./public
```

Install the read-only variant:

```bash
npx vertex-editor ./public --lite
```

The same installer can be streamed without installing a package:

```bash
curl -fsSL https://raw.githubusercontent.com/Andersseen/vertex/main/scripts/install.mjs | node - ./public
```

## Plain HTML

```html
<script src="/web-editor.min.js"></script>

<vertex-editor
  value="const answer: number = 42;"
  language="typescript"
  theme="dark"
  line-numbers="true"
  height="360px"
  aria-label="TypeScript editor"
></vertex-editor>
```

For read-only display, load `web-editor-lite.min.js` and use
`<vertex-editor-lite>`.

## Loading rules

- Load each bundle once.
- Wait for the `ready` event before relying on methods that need CodeMirror.
- Set boolean attributes to `"true"` or `"false"`.
- Use properties or `setValue()` for frequent programmatic updates.
- Always provide a useful `aria-label` in context.
