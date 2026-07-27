# @vertex/web-editor

Framework-agnostic custom elements for embedding the Vertex code editor in
another product.

This package is intentionally an editor, not an IDE. It has no filesystem, Git,
terminal, build, preview, deployment, workbench UI, or Vertex application
service dependency.

## Elements

| Element | Purpose | Size budget |
| --- | --- | --- |
| `<vertex-editor>` | Full editable Angular Elements + CodeMirror editor | 1250 KiB minified |
| `<vertex-editor-lite>` | Native, read-only CodeMirror display | 500 KiB minified |

Both use the compact web language profile: JavaScript, TypeScript, HTML, CSS,
and JSON. Languages load lazily and are cached.

## Install

```bash
npx vertex-editor ./public
```

Read-only lite bundle:

```bash
npx vertex-editor ./public --lite
```

Or stream the installer:

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

For read-only display:

```html
<script src="/web-editor-lite.min.js"></script>

<vertex-editor-lite
  value="console.log('Hello Vertex');"
  language="javascript"
  theme="dark"
  height="240px"
  aria-label="JavaScript example"
></vertex-editor-lite>
```

## Public contract

The canonical API source is
[`apps/docs/src/content/docs/editor/api.md`](../../../apps/docs/src/content/docs/editor/api.md).
It documents:

- attributes and matching JavaScript properties;
- `getValue`, `setValue`, `insertText`, and `focus`;
- `ready`, `valueChange`, and `cursorActivity` events;
- the smaller lite-element contract;
- supported language identifiers.

TypeScript declarations are copied to `dist/index.d.ts` during the package
build and add both public tags to `HTMLElementTagNameMap`.

## Styling

Host-level custom properties are stable:

```css
vertex-editor,
vertex-editor-lite {
  --vertex-editor-font-size: 15px;
  --vertex-editor-line-height: 1.6;
  --vertex-editor-touch-font-size: 16px;
}
```

Use `theme="dark"` or `theme="light"` for editor colors. Internal CodeMirror
selectors are not a public API.

## Development

From the repository root:

```bash
bun web-editor:build
bun web-editor-demo:start
```

The build produces:

- `dist/web-editor.min.js`;
- `dist/web-editor-lite.min.js`;
- source maps and AOT aliases;
- `dist/index.d.ts`.

Bundle budgets and required declaration artifacts are checked by the build.

## Architecture rule

This package may depend on `@vertex/editor-core`. It must not import
`@vertex/runtime`, `@vertex/core`, `@vertex/ui`, or `@vertex/ide-ui`.
`bun run check:boundaries` enforces this rule.
