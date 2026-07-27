---
title: Roadmap
description: The order in which Vertex is turning its editor foundation into a useful product.
---

The near-term goal is not to compete with VS Code feature for feature. It is to
make the web editor and keyboard-first tablet experience dependable.

## Foundation

- Shared editor configuration and language profiles — complete.
- Enforced package boundaries — complete.
- Bundle budgets for both custom elements — complete.
- Public documentation and canonical editor API — in progress.
- IME, accessibility, typing-latency, and memory budgets — next.

## Browser workbench MVP

- Capability detection and graceful fallback.
- Recovery UX for clone, install, storage, and preview failures.
- Blocking clone → edit → reload → restore browser test.
- Project search, command palette, and useful Git status/diff.
- Tablet navigation for sidebars and the bottom panel.

## Installed app

- One typed platform-adapter contract.
- Shared workbench controllers instead of duplicated application state.
- Physical iPad/tablet validation for keyboard, touch, lifecycle, and orientation.
- Removal of obsolete terminal implementations after adapter migration.

VS Code compatibility can be explored incrementally after these workflows are
reliable. LSP, themes, keymaps, and selected web-compatible extensions are more
valuable early targets than promising the full extension host.
