---
title: API reference
description: Attributes, methods, events, and language support for the Vertex editor elements.
---

## `<vertex-editor>`

### Attributes and properties

| Attribute | Property | Type | Default |
| --- | --- | --- | --- |
| `value` | `value` | `string` | `""` |
| `language` | `language` | supported language | `"typescript"` |
| `theme` | `theme` | `"dark" \| "light"` | `"dark"` |
| `line-numbers` | `lineNumbers` | `boolean` | `true` |
| `readonly` | `readonly` | `boolean` | `false` |
| `word-wrap` | `wordWrap` | `boolean` | `false` |
| `height` | `height` | `string` | `"100%"` |
| `font-size` | `fontSize` | pixel number as string | `"14"` |
| `tab-size` | `tabSize` | `number` | `2` |
| `placeholder` | `placeholder` | `string` | `""` |
| `enable-search` | `enableSearch` | `boolean` | `true` |
| `enable-autocomplete` | `enableAutocomplete` | `boolean` | `true` |

Supported language identifiers are `javascript`, `js`, `typescript`, `ts`,
`html`, `css`, and `json`.

### Methods

```ts
getValue(): string;
setValue(value: string): void;
insertText(text: string): void;
focus(): void;
```

### Events

| Event | `CustomEvent.detail` |
| --- | --- |
| `ready` | `void` |
| `valueChange` | `string` |
| `cursorActivity` | `{ line: number; column: number; index: number }` |

```js
const editor = document.querySelector("vertex-editor");

editor.addEventListener("ready", () => {
  editor.focus();
});

editor.addEventListener("valueChange", (event) => {
  console.log(event.detail);
});
```

## `<vertex-editor-lite>`

The lite element supports `value`, `language`, `theme`, `line-numbers`,
`word-wrap`, `height`, and `font-size`, with matching camelCase JavaScript
properties.

```ts
getValue(): string;
setValue(value: string): void;
focus(): void;
```

It emits `ready`. It never emits a value-change event because it is read-only.
