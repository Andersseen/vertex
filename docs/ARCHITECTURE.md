# Vertex product architecture

Vertex is a family of editor products. They share editing primitives, but they
do not share the same product scope.

`apps/docs` documents these products but is not itself a product/runtime
surface. It may consume published artifacts for examples; production packages
must never depend on it.

## Product boundaries

### `@vertex/web-editor`

An embeddable `<vertex-editor>` custom element for documentation, learning
platforms, snippets, and application-specific editing.

It owns:

- the custom-element API;
- editable and read-only presentation modes;
- editor attributes, properties, methods, and events;
- a deliberately small web-language profile.

It must not depend on filesystem, Git, terminal, build, preview, deployment,
workbench UI, or application services.

### `apps/web`

The complete browser workbench. It composes the editor, IDE UI, Angular
services, and browser runtime.

It owns:

- repository and workspace flows;
- OPFS persistence;
- browser Git;
- build and WebContainer preview;
- full-workbench routing and session UX.

### `apps/desktop`

The installed Tauri surface for desktop and, as platform support is developed,
tablet/mobile. It composes the shared editor and workbench UI with native
adapters.

It owns:

- native filesystem selection and access;
- native terminal/process bridges;
- installed-app lifecycle and platform integration.

Preview is optional here and is not part of the editor contract.

## Shared packages

```text
@vertex/types
  dependency-free product contracts

@vertex/editor-core
  framework-agnostic CodeMirror configuration and language registries

@vertex/ide-ui
  reusable IDE presentation primitives

@vertex/ui
  Angular workbench components

@vertex/core
  Angular application services and platform adapters

@vertex/runtime
  Angular-free browser filesystem, Git, build, preview, and deploy
```

## Allowed dependency direction

```text
apps/web ─────────┐
apps/desktop ─────┼──> @vertex/ui ─────> @vertex/editor-core
                  │         │
                  │         ├──────────> @vertex/ide-ui
                  │         └──────────> @vertex/core
                  │
                  ├──> @vertex/runtime
                  └──> @vertex/types

@vertex/web-editor ────────> @vertex/editor-core
```

Important invariants:

1. `@vertex/editor-core` has no Angular or product dependencies.
2. `@vertex/runtime` has no Angular dependencies.
3. `@vertex/web-editor` never imports workbench or runtime packages.
4. `@vertex/types` stays implementation-independent.
5. Apps compose packages; packages do not import apps.
6. Documentation may consume public artifacts; runtime packages do not import
   documentation source.

`bun run check:boundaries` enforces the first four invariants in CI.

## Editor profiles

Editor behavior is shared through `@vertex/editor-core`, while each surface
chooses its own profile:

- `languages/web`: compact JS, TS, HTML, CSS, and JSON profile;
- `languages/workbench`: broader profile including JSX/TSX, Markdown, Rust,
  Python, and CSS-family aliases.

Languages are loaded lazily and cached. Adding a workbench language must not
increase the initial bundle of the embeddable editor.

## Product decisions

- The web component is an editor, not a miniature IDE.
- Preview belongs to a workbench/runtime composition, not editor-core.
- Tauri provides native adapters; Rust is a platform bridge, not a requirement
  for product logic.
- Tablet support means keyboard, pointer, touch, dynamic viewport, and
  lifecycle resilience. Phone layouts may support review and small edits
  without pretending to provide a full desktop workbench.
- VS Code compatibility is not a base-layer requirement. LSP, themes, keymaps,
  and selected web extensions can be added incrementally.
