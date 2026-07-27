# @vertex/editor-core

Framework-independent CodeMirror foundation shared by Vertex editor surfaces.

It owns editor state configuration, shared behavior, and lazy language
registries. It has no Angular or product dependency.

## Language profiles

- `@vertex/editor-core/languages/web`: JavaScript, TypeScript, HTML, CSS, JSON.
- `@vertex/editor-core/languages/workbench`: broader project-editing profile,
  including JSX/TSX, Markdown, Rust, Python, and CSS-family aliases.

The embeddable editor uses the compact web profile. Workbench-only languages
must not increase its initial bundle.

## Development

```bash
bun --cwd packages/frontend/editor-core check-types
bun --cwd packages/frontend/editor-core test
```

`bun run check:boundaries` verifies that this package stays free of Angular and
Vertex product dependencies.
