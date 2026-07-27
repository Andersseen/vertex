# Vertex Docs

Public documentation for the Vertex product family, built with Astro Starlight.

The docs describe all product surfaces rather than coupling documentation to
the Angular workbench:

- browser workbench;
- installed Tauri app;
- `<vertex-editor>` and `<vertex-editor-lite>`;
- shared packages and architecture.

## Development

From the repository root:

```bash
bun docs:dev
```

That command builds the web editor first so the docs exercise the same bundle
that consumers install.

## Build

```bash
bun docs:build
```

Output is written to `apps/docs/dist`.

The docs are static and can be deployed to Cloudflare Pages. Deployment is not
wired yet because the production hostname and release policy are still an
explicit product decision.
