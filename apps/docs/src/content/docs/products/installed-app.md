---
title: Installed app
description: Tauri supplies native capabilities around the shared TypeScript workbench.
---

`apps/desktop` is the installed Vertex surface. Tauri and Rust are platform
bridges, not a second implementation of the product.

The installed app owns:

- native filesystem selection and access;
- process and terminal bridges;
- installed-app lifecycle;
- platform-specific keyboard, window, suspend, and resume behavior.

Product state and editor behavior should remain in shared TypeScript packages
unless profiling proves that a native implementation is necessary.

Tablet support is a product target, but it requires validation on physical
hardware. A responsive desktop layout alone is not enough: hardware keyboards,
touch selection, virtual keyboards, orientation, safe areas, and lifecycle
transitions all matter.
