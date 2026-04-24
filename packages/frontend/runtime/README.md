# @vertex/runtime

Browser-native runtime for Vertex IDE: virtual filesystem (OPFS), Git client, esbuild bundler,
WebContainers-based preview, and Cloudflare deploy adapters.

---

## Install

### From the monorepo (internal use)

Already wired via workspace deps. No extra setup.

### GitHub install (external TypeScript project)

```bash
npm install github:andersseen/vertex#main @webcontainer/api
```

Add path mappings to your `tsconfig.json` so TypeScript resolves the subpaths:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "paths": {
      "@vertex/runtime": ["./node_modules/@vertex/runtime/src/index.ts"],
      "@vertex/runtime/preview-wc": ["./node_modules/@vertex/runtime/src/preview-wc/index.ts"],
      "@vertex/runtime/preview-wc-headless": ["./node_modules/@vertex/runtime/src/preview-wc-headless/index.ts"]
    }
  }
}
```

> **Note:** `moduleResolution: "bundler"` (Vite, esbuild, Bun) resolves the TypeScript source
> directly and is the recommended setup. For `moduleResolution: "node"`, use the compiled
> `dist/` output (`./node_modules/@vertex/runtime/dist/...`).

### From a GitHub Release tarball

```bash
npm install https://github.com/andersseen/vertex/releases/download/v0.1.0/vertex-runtime-0.1.0.tgz
```

---

## Required headers (WebContainers)

Both `@vertex/runtime/preview-wc` and `@vertex/runtime/preview-wc-headless` use the
[WebContainers API](https://webcontainers.io/) which requires cross-origin isolation.
Your hosting app must send these response headers:

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

**Cloudflare Pages** — add to `public/_headers`:

```
/*
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin
```

**Vite dev server** — add to `vite.config.ts`:

```ts
server: {
  headers: {
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
  },
},
```

---

## Quickstart — `WebContainerPreview` (iframe, for Vertex IDE)

```ts
import { WebContainerPreview } from '@vertex/runtime/preview-wc'

// Create an iframe (Angular / React / plain HTML — your choice)
const iframe = document.querySelector<HTMLIFrameElement>('#preview')!
iframe.sandbox.value = 'allow-scripts allow-same-origin allow-forms allow-modals allow-popups'

// Instantiate with your VirtualFS (OPFS, MemoryFS, …)
const preview = new WebContainerPreview(iframe, {
  fs: myVirtualFs,
  onPhase: (phase, msg) => console.log(phase, msg),
  onLog: ({ chunk }) => process.stdout.write(chunk),
})

// Boot, install, start dev server, point iframe at it
const session = await preview.start()
console.log('Preview running at', session.url)

// Reload
session.reload()

// Tear down
await session.stop()
```

---

## Quickstart — `WebContainerRunner` (headless, for Devflare / CI)

```ts
import { WebContainerRunner } from '@vertex/runtime/preview-wc-headless'

const runner = new WebContainerRunner({
  gitClone: { url: 'https://github.com/user/my-app.git' },
  onPhase: (phase, msg) => console.log(phase, msg),
  onLog: ({ chunk }) => process.stdout.write(chunk),
})

await runner.boot()                         // clone + mount
await runner.install()                      // npm/pnpm/yarn/bun install
await runner.run('build')                   // npm run build
const files = await runner.extractDir('/dist') // { 'index.html': Uint8Array, … }

await runner.destroy()
```

---

## Subpath exports

| Import | Description |
|--------|-------------|
| `@vertex/runtime` | VirtualFS + GitClient types |
| `@vertex/runtime/fs` | `VirtualFS`, `MemoryFS`, `OPFSFS` |
| `@vertex/runtime/git` | `GitClient` |
| `@vertex/runtime/build` | `Bundler` (esbuild-wasm) |
| `@vertex/runtime/preview-wc-headless` | `WebContainerRunner` — headless, no DOM |
| `@vertex/runtime/preview-wc` | `WebContainerPreview` — iframe wrapper |
| `@vertex/runtime/deploy` | `DeployManager` (Cloudflare Pages / Workers) |
| `@vertex/runtime/types-checker` | `TypeScriptChecker` |
| `@vertex/runtime/lint` | `ESLintRunner` |
| `@vertex/runtime/format` | `PrettierFormatter` |
| `@vertex/runtime/css` | `PostcssRunner`, `SassCompiler` |

---

## License

MIT — see [LICENSE](./LICENSE).

WebContainers is provided by [StackBlitz](https://webcontainers.io/) under their own terms.
Non-commercial use is free; check their license for commercial projects.
