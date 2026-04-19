# @vertex/runtime — Plan de implementación

Browser-native runtime: VirtualFS, Git, Build, Preview, Deploy.
Sin WebContainers de pago. MIT license. Publicable en npm.

---

## Fases

| # | Fase | Archivo | Semanas | Bloqueante |
|---|---|---|---|---|
| 1 | VirtualFS + Git | [phase-1-virtualfs-git.md](./phase-1-virtualfs-git.md) | 1-2 | — |
| 2 | Bundler (esbuild-wasm) | [phase-2-build.md](./phase-2-build.md) | 2-3 | Phase 1 |
| 3 | Preview (SW + iframe) | [phase-3-preview.md](./phase-3-preview.md) | 2-3 | Phase 1+2 |
| 4 | Node.js Runtime (Nodebox) | [phase-4-nodebox.md](./phase-4-nodebox.md) | 3-4 | Phase 1 |
| 5 | Deploy Adapters (CF) | [phase-5-deploy.md](./phase-5-deploy.md) | 1 | Phase 1+2 |
| 6 | Extras (CSS, TS, Lint) | [phase-6-extras.md](./phase-6-extras.md) | indefinido | independientes |

---

## Dependencias entre fases

```
Phase 1 (VirtualFS + Git)
    ├── Phase 2 (Build) ──────── Phase 3 (Preview)
    ├── Phase 4 (Nodebox)  ────► Phase 3 (Preview)
    └── Phase 5 (Deploy) ──────► (necesita Phase 2 para tener dist/)

Phase 6 (Extras) ──── independientes, añadir según necesidad
```

## Flujo completo al terminar

```
URL del repo
    ↓ Phase 1
git clone → VirtualFS
    ↓ Phase 2 (simple) o Phase 4 (complejo)
npm install + build → dist/ en VirtualFS
    ↓ Phase 3
Service Worker sirve dist/ → iframe preview
    ↓ Phase 5
CF Pages API → URL pública
```

## Estructura del package

```
packages/frontend/runtime/
├── src/
│   ├── fs/          Phase 1 — VirtualFS, OPFS, Memory
│   ├── git/         Phase 1 — isomorphic-git wrapper
│   ├── build/       Phase 2 — esbuild-wasm, plugins
│   ├── preview/     Phase 3 — Service Worker, iframe
│   ├── node/        Phase 4 — Nodebox, npm, terminal
│   ├── deploy/      Phase 5 — CF Pages, CF Workers
│   ├── css/         Phase 6 — PostCSS, Sass
│   ├── lint/        Phase 6 — ESLint
│   ├── format/      Phase 6 — Prettier
│   ├── types/       Phase 6 — TypeScript checker
│   └── index.ts     — Barrel exports
└── package.json     — name: "@vertex/runtime"
```

## Reglas de sesión

- Cada fase tiene su propio archivo de plan
- Abrir solo el archivo de la fase en curso para no saturar contexto
- Al terminar una fase: marcar criterios completados y pasar a la siguiente
- La web app (`apps/web`) se puede usar para probar cada fase
