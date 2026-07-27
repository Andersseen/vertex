---
title: Commands
description: The supported development, quality, build, and deployment commands.
---

Run commands from the repository root unless noted otherwise.

| Command | Purpose |
| --- | --- |
| `bun web:dev` | Start the browser workbench on port 5173 |
| `bun desktop:dev` | Start the Tauri application |
| `bun docs:dev` | Build the editor bundle and start the docs |
| `bun web-editor-demo:start` | Build and demonstrate the custom elements |
| `bun run build` | Build every workspace through Turborepo |
| `bun docs:build` | Build the editor dependency and static docs |
| `bun lint` | Run workspace lint tasks |
| `bun check-types` | Run workspace type checks |
| `bun test` | Run unit tests |
| `bun test:e2e` | Run browser-workbench Playwright tests |
| `bun run check:boundaries` | Enforce package dependency rules |
| `bun web:deploy` | Deploy the web workbench to Cloudflare Pages |

There is intentionally no docs deploy command yet. The docs build is static and
Cloudflare-compatible, but its production hostname and release policy should be
chosen before adding a second Pages project.
