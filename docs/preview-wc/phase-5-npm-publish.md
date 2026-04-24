# Phase 5 — npm publish

> **Goal:** Publish `@vertex/runtime` (with the two new preview subpaths) to the npm registry under a stable, versioned release. Automate future releases via GitHub Actions.
>
> **Prerequisite:** Phase 4 complete — tarball works, README written, at least one external consumer tested.
>
> **Estimated effort:** 1 day.

---

## Session prompt

> You are continuing the Vertex IDE monorepo work. The goal of this session is **Phase 5 — npm publish** as described in [docs/preview-wc/phase-5-npm-publish.md](../preview-wc/phase-5-npm-publish.md). Read that file and [docs/preview-wc/README.md](../preview-wc/README.md) for context. Phase 4 is complete: the package builds cleanly, the tarball installs correctly, and README exists. In this session you wire up the registry publish. All typecheck / lint / tests must pass at the end.

---

## Scope decision: scoped package name

Two options:

| Option | Name | When to use |
|--------|------|-------------|
| A | `@andersseen/vertex-runtime` | If you want the scope to match your npm username and keep the package clearly personal. |
| B | `@vertex/runtime` | If you intend to publish the whole monorepo as a suite under `@vertex/*`. Requires the `vertex` npm organisation. |

**Recommendation:** Use option A (`@andersseen/vertex-runtime`) initially. Rename to `@vertex/runtime`
once the org exists on npm. Add an alias `@vertex/runtime` → `@andersseen/vertex-runtime` in the
tsconfig paths of internal consumers so the rename is a one-commit change later.

---

## Steps

### 1. Polish `package.json` for the registry

In `packages/frontend/runtime/package.json`:

```json
{
  "name": "@andersseen/vertex-runtime",
  "version": "0.1.0",
  "description": "VirtualFS, Git client, and WebContainers preview runner for Vertex IDE",
  "license": "MIT",
  "author": "andersseen",
  "repository": {
    "type": "git",
    "url": "https://github.com/andersseen/vertex.git",
    "directory": "packages/frontend/runtime"
  },
  "homepage": "https://github.com/andersseen/vertex/tree/main/packages/frontend/runtime#readme",
  "bugs": "https://github.com/andersseen/vertex/issues",
  "keywords": ["webcontainers", "virtual-filesystem", "git", "browser-ide", "preview"],
  "type": "module",
  "exports": { ... },
  "files": ["dist", "src", "README.md", "LICENSE"],
  "engines": { "node": ">=18" },
  "peerDependencies": {
    "@webcontainer/api": "^1.5.0"
  },
  "peerDependenciesMeta": {
    "@webcontainer/api": { "optional": false }
  }
}
```

Key points:
- `"files"` controls what goes into the tarball. Include both `src/` (TypeScript source for
  monorepo consumers) and `dist/` (compiled ESM for external consumers).
- `@webcontainer/api` as a **peer dependency** — callers install it; we don't bundle it.
  This avoids shipping two copies when the consumer also depends on it directly.
- Remove `@webcontainer/api` from `dependencies` and add it to `devDependencies` (for local
  type-checking) and `peerDependencies`.

### 2. Add `LICENSE`

```bash
cp /dev/stdin packages/frontend/runtime/LICENSE << 'EOF'
MIT License

Copyright (c) 2024 andersseen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

### 3. Add `.npmignore`

```
# dev-only files
*.spec.ts
__tests__/
*.test.ts
build.ts
build.standalone.ts
tsconfig*.json
```

This trims unnecessary files from the published tarball (the `files` field is the allow-list;
`.npmignore` is the deny-list applied on top of it).

### 4. Verify the tarball content

```bash
cd packages/frontend/runtime
bun run build
npm pack --dry-run
```

Check the output list. You should see `dist/`, `src/`, `README.md`, `LICENSE`, and
`package.json`. You should NOT see `node_modules`, `.cache`, or spec files.

### 5. Manual publish (first time)

```bash
# authenticate once
npm login --scope=@andersseen

# publish
cd packages/frontend/runtime
npm publish --access public
```

Verify on `https://www.npmjs.com/package/@andersseen/vertex-runtime`.

### 6. GitHub Actions CI/CD for automated publish

Create `.github/workflows/publish-runtime.yml`:

```yaml
name: Publish @andersseen/vertex-runtime

on:
  push:
    tags:
      - 'runtime-v*'   # trigger on tags like runtime-v0.2.0

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write   # needed for npm provenance

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: '1.3.11'

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Typecheck
        run: bun --cwd packages/frontend/runtime check-types

      - name: Test
        run: bun --cwd packages/frontend/runtime test

      - name: Build
        run: bun --cwd packages/frontend/runtime run build

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - name: Publish
        run: npm publish --access public --provenance
        working-directory: packages/frontend/runtime
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Add `NPM_TOKEN` to GitHub Actions secrets (Settings → Secrets → New repository secret).

To trigger:

```bash
git tag runtime-v0.2.0
git push origin runtime-v0.2.0
```

### 7. Versioning strategy

Follow **SemVer**. While the package is `0.x.y`:

| Change | Version bump |
|--------|-------------|
| New export / non-breaking feature | `0.x+1.0` (minor) |
| Bug fix | `0.x.y+1` (patch) |
| Breaking API change | `0.x+1.0` with migration note in CHANGELOG |

Once API is stable: `1.0.0`. Breaking changes from `1.x` bump the major.

Keep a `CHANGELOG.md` in `packages/frontend/runtime/` following Keep a Changelog format.
Each release section includes: Added, Changed, Fixed, Breaking, Migration guide if needed.

### 8. Consuming the published package

After publish, external consumers replace the tarball/GitHub install:

```bash
npm install @andersseen/vertex-runtime @webcontainer/api
```

tsconfig path mappings are no longer needed — `@andersseen/vertex-runtime` resolves via
`node_modules`. They only reference the distributed `dist/` output, not raw TypeScript.

For the Vertex monorepo itself: keep using the workspace package `@vertex/runtime`
(the local source) so changes are reflected immediately without re-publishing. The two names
co-exist while the internal alias is active.

---

## Acceptance criteria

- [ ] `packages/frontend/runtime/package.json` has correct `name`, `version`, `license`, `files`, `peerDependencies`.
- [ ] `LICENSE` file exists.
- [ ] `npm pack --dry-run` output contains only expected files.
- [ ] `npm publish` succeeds and package appears on npm registry.
- [ ] `.github/workflows/publish-runtime.yml` exists and triggers on `runtime-v*` tags.
- [ ] A scratch project can `npm install @andersseen/vertex-runtime @webcontainer/api` and import `WebContainerRunner` + `WebContainerPreview` without errors.
- [ ] `bun --cwd packages/frontend/runtime check-types` passes.
- [ ] `bun --cwd apps/web check-types` passes.

---

## Commit strategy

- Commit 1: `package.json` registry metadata + `LICENSE` + `.npmignore`.
- Commit 2: `CHANGELOG.md` with initial entry.
- Commit 3: `.github/workflows/publish-runtime.yml`.
- Tag: `runtime-v0.1.0` → triggers the workflow on push.
