---
title: Browser workbench
description: The complete project workflow that runs in a browser tab.
---

`apps/web` composes the shared editor and IDE UI with browser-native runtime
capabilities.

It owns:

- repository and workspace flows;
- OPFS and IndexedDB persistence;
- browser Git;
- build and WebContainer preview;
- session restoration and application routing;
- Cloudflare deployment adapters.

## Capability-dependent behavior

Not every browser or embedding context exposes OPFS, cross-origin isolation, or
WebContainers. Product code should detect each capability independently and
offer a clear fallback without losing edits.

Preview belongs here because it operates on a project and a runtime. It does not
belong in `@vertex/editor-core` or `@vertex/web-editor`.
