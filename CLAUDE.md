# CLAUDE.md

> **Note:** The authoritative project documentation is in [`AGENTS.md`](./AGENTS.md).
> This file is kept as a quick reference for Claude Code; if you find any discrepancy, `AGENTS.md` prevails.

## Summary

- Turborepo + Bun (`bun@1.3.11`) monorepo.
- Web IDE with Angular 21 zoneless + Analog.js + Vite.
- Desktop with Tauri + Rust.
- Browser runtime: OPFS + IndexedDB, native git, esbuild-wasm, WebContainers.

## Essential commands

```bash
bun web:dev        # Vite dev server → http://localhost:5173
bun desktop:dev    # Tauri desktop
bun lint           # lint the whole monorepo
bun check-types    # typecheck the whole monorepo
bun test           # unit tests
bun test:e2e       # Playwright e2e
bun run deploy     # build + publish to Cloudflare Pages (the only deploy target)
```

## Key conventions

- Signals-first, `input()`/`output()`, `inject()`, `OnPush`.
- Standalone components without explicit `standalone: true`.
- Selectors: `v-` in shared libraries; `app-` allowed only in applications.
- Theming with CSS custom properties `--ide-*`.
- No Tailwind, no PrimeNG.

For full details see [`AGENTS.md`](./AGENTS.md).
