# Vertex Editor API

The canonical API reference lives in the documentation application:

- [API reference](../../../apps/docs/src/content/docs/editor/api.md)
- [Installation](../../../apps/docs/src/content/docs/editor/installation.md)
- [Theming](../../../apps/docs/src/content/docs/editor/theming.md)

The public elements are `<vertex-editor>` and `<vertex-editor-lite>`. No other
custom-element tag is part of the package contract.

The generated TypeScript declaration is `dist/index.d.ts`; its source is
[`src/index.d.ts`](src/index.d.ts). The package build fails if that declaration
artifact is missing.
