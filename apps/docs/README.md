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

## Deploy

The `main` branch is deployed by the shared GitHub Actions pipeline to the
Cloudflare Pages project `vertex-docs`:

<https://vertex-docs.pages.dev>

Local deployment uses the same Wrangler command:

```bash
bun docs:deploy
```

The Pages project must be created once before the first CI deployment:

```bash
bunx wrangler pages project create vertex-docs --production-branch main
```

See [`docs/DEPLOYMENT.md`](../../docs/DEPLOYMENT.md) for credentials, pipeline,
and custom-domain setup.
