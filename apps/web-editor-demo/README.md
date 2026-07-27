# Vertex Editor Demo

Angular host application used to exercise the published custom-element bundles.
It is a consumer of `<vertex-editor>` and `<vertex-editor-lite>`, not another
Vertex product surface.

## Run

From the repository root:

```bash
bun web-editor-demo:start
```

The root command builds `@vertex/web-editor` first and then starts this host.

## Purpose

- verify that the IIFE bundles register the public custom-element names;
- demonstrate full and lite variants without importing internal Angular code;
- test attributes, properties, methods, events, themes, and sizing as a
  downstream consumer would;
- catch accidental dependencies on workbench or runtime packages.

Framework-specific product behavior does not belong here. Add it to the owning
application or shared package.
