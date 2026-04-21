# @vertex/runtime - Implementation Plan

Browser-native runtime: VirtualFS, Git, Build, Preview, Deploy.
No paid WebContainers. MIT license. Publishable to npm.

---

## Phases

| #   | Phase                     | File                                                   | Weeks      | Blocked by  |
| --- | ------------------------- | ------------------------------------------------------ | ---------- | ----------- |
| 1   | VirtualFS + Git           | [phase-1-virtualfs-git.md](./phase-1-virtualfs-git.md) | 1-2        | -           |
| 2   | Bundler (esbuild-wasm)    | [phase-2-build.md](./phase-2-build.md)                 | 2-3        | Phase 1     |
| 3   | Preview (SW + iframe)     | [phase-3-preview.md](./phase-3-preview.md)             | 2-3        | Phase 1+2   |
| 4   | Node.js Runtime (Nodebox) | [phase-4-nodebox.md](./phase-4-nodebox.md)             | 3-4        | Phase 1     |
| 5   | Deploy Adapters (CF)      | [phase-5-deploy.md](./phase-5-deploy.md)               | 1          | Phase 1+2   |
| 6   | Extras (CSS, TS, Lint)    | [phase-6-extras.md](./phase-6-extras.md)               | open-ended | independent |

---

## Phase dependencies

```
Phase 1 (VirtualFS + Git)
    |- Phase 2 (Build) -------- Phase 3 (Preview)
    |- Phase 4 (Nodebox)  ----> Phase 3 (Preview)
    '- Phase 5 (Deploy) ------> (requires Phase 2 to have dist/)

Phase 6 (Extras) ---- independent, add as needed
```

## End-to-end flow when complete

```
Repository URL
    -> Phase 1
git clone -> VirtualFS
    -> Phase 2 (simple) or Phase 4 (complex)
npm install + build -> dist/ in VirtualFS
    -> Phase 3
Service Worker serves dist/ -> iframe preview
    -> Phase 5
CF Pages API -> public URL
```

## Package structure

```
packages/frontend/runtime/
|- src/
|  |- fs/          Phase 1 - VirtualFS, OPFS, Memory
|  |- git/         Phase 1 - isomorphic-git wrapper
|  |- build/       Phase 2 - esbuild-wasm, plugins
|  |- preview/     Phase 3 - Service Worker, iframe
|  |- node/        Phase 4 - Nodebox, npm, terminal
|  |- deploy/      Phase 5 - CF Pages, CF Workers
|  |- css/         Phase 6 - PostCSS, Sass
|  |- lint/        Phase 6 - ESLint
|  |- format/      Phase 6 - Prettier
|  |- types/       Phase 6 - TypeScript checker
|  '- index.ts     - Barrel exports
'- package.json    - name: "@vertex/runtime"
```

## Session rules

- Each phase has its own plan file.
- Open only the file for the current phase to avoid context overload.
- When a phase is done: mark criteria complete and move to the next.
- The web app [apps/web](apps/web) can be used to test each phase.
