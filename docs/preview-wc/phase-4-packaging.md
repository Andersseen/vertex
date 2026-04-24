# Phase 4 — Packaging & distribution (pre-npm)

> **Goal:** Make `@vertex/runtime/preview-wc` and `@vertex/runtime/preview-wc-headless` consumable outside the monorepo without publishing to npm. Covers: tarball install, GitHub install, GitHub Release artifacts, and an optional standalone ESM bundle.
>
> **Prerequisite:** Phase 3 complete and smoke-tested (previews actually render inside Vertex IDE).
>
> **Estimated effort:** 1–2 days.

---

## Session prompt

> You are continuing the Vertex IDE monorepo work. The goal of this session is **Phase 4 — Packaging & distribution** as described in [docs/preview-wc/phase-4-packaging.md](../preview-wc/phase-4-packaging.md). Read that file and [docs/preview-wc/README.md](../preview-wc/README.md) for context. Phases 0–3 have landed; the preview works end-to-end inside Vertex IDE. In this session you prepare the package for external consumption without yet publishing to npm. All typecheck / lint / tests must pass at the end.

---

## Context

`packages/frontend/runtime` is a workspace package today — it ships raw TypeScript
source via subpath exports. External projects that consume it need either:

1. A compiled tarball (`npm pack` / `bun pack`) — install with `file:` or GitHub Release.
2. A direct GitHub install — `npm install github:andersseen/vertex#main` (requires exports
   in `package.json` to point at source, which already works in monorepo).
3. A standalone ESM/IIFE bundle — for projects that don't use a bundler or for CDN use.

For the immediate use-case (Devflare consuming from a separate repo), **option 2 + option 1 as
fallback** is the pragmatic path. npm publish is Phase 5.

---

## Steps

### 1. Audit `package.json` exports

Verify `packages/frontend/runtime/package.json` has the following structure for the two
new subpaths (and all existing ones):

```json
{
  "name": "@vertex/runtime",
  "version": "0.x.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    },
    "./preview-wc-headless": {
      "import": "./src/preview-wc-headless/index.ts",
      "types": "./src/preview-wc-headless/index.ts"
    },
    "./preview-wc": {
      "import": "./src/preview-wc/index.ts",
      "types": "./src/preview-wc/index.ts"
    }
  }
}
```

For **TypeScript consumers outside the monorepo** (not using the Vite subpath plugin), the
`types` field pointing at `.ts` source works fine when `"moduleResolution": "bundler"` or
`"node16"` + `"allowImportingTsExtensions": false`. If the external consumer uses plain
`"node"` resolution, they'll need a compiled output. Document this in the package README.

### 2. Add a `prepublish` build step (optional but recommended)

Create `packages/frontend/runtime/build.ts`:

```ts
import { build } from 'bun'
import path from 'node:path'

const subpaths = [
  'index',
  'preview-wc-headless/index',
  'preview-wc/index',
  // add others as needed
]

for (const entry of subpaths) {
  await build({
    entrypoints: [`./src/${entry}.ts`],
    outdir: `./dist/${path.dirname(entry)}`,
    target: 'browser',
    format: 'esm',
    external: ['@webcontainer/api', '@angular/*'],
    splitting: false,
  })
}
```

Add to `package.json`:

```json
"scripts": {
  "build": "bun build.ts",
  "prepublishOnly": "bun run build"
}
```

For the **GitHub install path** (`npm install github:...`), the raw TypeScript source is
already sufficient for monorepo consumers that go through the `vertex-runtime-subpaths` Vite
plugin. Only compile if an external consumer tells you they need it.

### 3. Produce a tarball (for manual distribution)

```bash
cd packages/frontend/runtime
bun run build          # compile to dist/
npm pack               # produces vertex-runtime-x.y.z.tgz
```

Upload `vertex-runtime-x.y.z.tgz` as a GitHub Release asset (step 5 below). Consumers install via:

```bash
npm install https://github.com/andersseen/vertex/releases/download/v0.x.0/vertex-runtime-0.x.0.tgz
```

### 4. GitHub direct install

For consumers in the same GitHub account with access to the private repo:

```bash
npm install github:andersseen/vertex#main
```

This installs the entire monorepo root, so the consumer needs to reference the nested
package correctly. Better: pin to a tag:

```bash
npm install github:andersseen/vertex#v0.x.0
```

To make subpath imports resolve, the consumer's `tsconfig.json` needs:

```json
{
  "compilerOptions": {
    "paths": {
      "@vertex/runtime": ["./node_modules/@vertex/runtime/src/index.ts"],
      "@vertex/runtime/preview-wc": ["./node_modules/@vertex/runtime/src/preview-wc/index.ts"],
      "@vertex/runtime/preview-wc-headless": ["./node_modules/@vertex/runtime/src/preview-wc-headless/index.ts"]
    }
  }
}
```

Document this in `packages/frontend/runtime/README.md`.

### 5. Create a GitHub Release

After each milestone:

```bash
git tag v0.x.0
git push origin v0.x.0
gh release create v0.x.0 \
  packages/frontend/runtime/vertex-runtime-0.x.0.tgz \
  --title "runtime v0.x.0" \
  --notes "WebContainers preview-wc and preview-wc-headless"
```

### 6. Standalone ESM bundle (optional)

For consumers that want a single file without bundler setup (e.g., Devflare edge worker,
demo pages), produce a browser ESM bundle:

```ts
// build.standalone.ts
import { build } from 'bun'

await build({
  entrypoints: ['./src/preview-wc-headless/index.ts'],
  outdir: './dist/standalone',
  target: 'browser',
  format: 'esm',
  // bundle all dependencies EXCEPT @webcontainer/api (loaded from CDN by consumer)
  external: ['@webcontainer/api'],
  naming: 'preview-wc-headless.esm.js',
})
```

Consumer loads it as:

```html
<script type="importmap">
{ "imports": { "@webcontainer/api": "https://esm.sh/@webcontainer/api" } }
</script>
<script type="module">
import { WebContainerRunner } from './preview-wc-headless.esm.js'
</script>
```

This is only useful when Devflare cannot share the monorepo. Skip for now if Devflare stays
in-monorepo.

### 7. Write `packages/frontend/runtime/README.md`

Minimum content:

- What the package is and its two main exports.
- Install instructions for all three methods (tarball, GitHub, monorepo subpath).
- Required COOP/COEP headers for WebContainers consumers.
- `tsconfig.json` path mapping snippet.
- Quickstart code snippets for `WebContainerRunner` and `WebContainerPreview`.
- License section referencing WebContainers (StackBlitz) non-commercial terms.

---

## What Devflare needs

Devflare is a separate Cloudflare Pages app. It uses `WebContainerRunner` (headless) to:

1. Boot a WebContainer.
2. `git clone` the user's repo.
3. `install` + `build`.
4. `extractDir('dist')` → pass to `@vertex/runtime/deploy/adapters/*`.

For now Devflare lives in the same monorepo → no packaging needed. When it moves out:

- Add `"@vertex/runtime": "github:andersseen/vertex#main"` to Devflare's `package.json`.
- Add `tsconfig.json` path mapping (step 4 above).
- Vite/Rollup: add alias pointing `@vertex/runtime/preview-wc-headless` → source file.

---

## Acceptance criteria

- [ ] `packages/frontend/runtime/package.json` exports `./preview-wc` and `./preview-wc-headless` correctly.
- [ ] `bun --cwd packages/frontend/runtime build` produces `dist/` with ESM output.
- [ ] `npm pack` inside `packages/frontend/runtime` produces a valid tarball.
- [ ] A fresh `npm install <tarball>` in a scratch directory + simple `import` resolves without errors.
- [ ] `packages/frontend/runtime/README.md` exists with install and quickstart instructions.
- [ ] GitHub Release `v0.x.0` created with the tarball attached.
- [ ] `bun --cwd packages/frontend/runtime check-types` passes.
- [ ] `bun --cwd apps/web check-types` still passes.

---

## Commit strategy

- Commit 1: `build.ts` + `prepublishOnly` script + `dist/` added to `.gitignore`.
- Commit 2: `README.md` for the runtime package.
- Commit 3: GitHub Release creation (manual step, not a commit).
