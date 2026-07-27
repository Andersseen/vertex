# @vertex/types

Shared TypeScript contracts for Vertex packages and applications.

Keep this package implementation-independent:

- no Angular;
- no Tauri;
- no browser runtime implementation;
- no imports from application packages.

Types that exist only for one implementation should remain with that
implementation instead of turning this package into a generic dumping ground.

```bash
bun --cwd packages/frontend/types check-types
bun --cwd packages/frontend/types test
```
