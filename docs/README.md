# Repository documentation

This directory contains engineering documents that are reviewed with the
codebase:

- `ARCHITECTURE.md`: product ownership and dependency direction;
- `EDITOR_FOUNDATION.md`: delivery checklist and known stability gaps;
- `DEPLOYMENT.md`: the Cloudflare production pipeline;
- `preview-wc/`: WebContainer design and implementation notes.

Public, task-oriented documentation lives in `apps/docs` and is built with
Starlight. Keep implementation decision records here; keep installation,
product, and public API guides in the docs application.

```bash
bun docs:dev
bun docs:build
```
