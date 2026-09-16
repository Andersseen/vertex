# Repository documentation

This directory contains engineering documents that are reviewed with the
codebase:

- [ROADMAP.md](ROADMAP.md): the version 1.0 product scope and delivery sequence;
- [roadmap/EXECUTION.md](roadmap/EXECUTION.md): bounded task assignments and handoffs;
- [roadmap/CONTRACTS.md](roadmap/CONTRACTS.md): shared implementation contracts;
- [roadmap/VALIDATION.md](roadmap/VALIDATION.md): fixtures and release acceptance gates;
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
