# Phase 1 — Headless `WebContainerRunner`

> **Goal:** Implement `@vertex/runtime/preview-wc-headless` exporting a `WebContainerRunner` class that boots a WebContainer, mounts files, runs `install` + arbitrary scripts, extracts output directories, and can start a dev server. No DOM / no iframe / no Angular.
>
> **Prerequisite:** Phase 0 cleanup done.
>
> **Estimated effort:** 3–5 days.
>
> **Consumer:** Phase 2 (UI wrapper) uses this directly. Devflare will eventually use it standalone for `clone + install + build + deploy-ready output`.

---

## Session prompt

> You are continuing the Vertex IDE monorepo work. The goal of this session is **Phase 1 — Headless WebContainerRunner** as described in [docs/preview-wc/phase-1-runner.md](../preview-wc/phase-1-runner.md). Read that file and [docs/preview-wc/README.md](../preview-wc/README.md) for context. Phase 0 has already landed (nodebox + preview-lite removed, placeholder PreviewPanel in place). Implement the runner strictly per the spec; do not start the UI wrapper (Phase 2). All tests, typecheck, and lint must pass at the end.

---

## Prerequisites

- Phase 0 complete: `preview-lite`, `preview-node`, `node/` directories gone.
- Clean `package.json` without `@codesandbox/nodebox`.
- Placeholder `PreviewPanelComponent` in `apps/web` (not touched in this phase).

---

## Scope of this phase

Create a new subpath module and nothing else. No UI changes. No integration with `apps/web` yet.

```
packages/frontend/runtime/src/
└── preview-wc-headless/
    ├── index.ts
    ├── webcontainer-runner.ts         ← the main class
    ├── package-manager-detect.ts      ← lockfile → PM chooser
    ├── file-mount.ts                  ← VFS → WebContainer FileSystemTree converter
    ├── output-extract.ts              ← extract dist/ back out as Record<string, Uint8Array>
    ├── types.ts                       ← config types, phase enum, log shape
    └── __tests__/
        └── package-manager-detect.spec.ts
        └── file-mount.spec.ts
```

---

## Public API

```ts
// types.ts
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

export type RunnerPhase =
  | 'boot'      // WebContainer.boot() in progress
  | 'mount'    // copying files in
  | 'install'  // running install
  | 'run'      // running arbitrary script
  | 'dev'      // starting dev server
  | 'ready'
  | 'stopped'
  | 'failed'

export interface RunnerLog {
  stream: 'stdout' | 'stderr'
  chunk: string
}

export interface RunnerOptions {
  /** Source for initial files. One of: */
  fs?: IVirtualFS
  files?: FileSystemTree          // WebContainer native shape
  gitClone?: { url: string; branch?: string; token?: string }

  /** Package manager override. Defaults to lockfile detection then 'npm'. */
  packageManager?: PackageManager

  /** Extra flags passed to the package manager install command. */
  installFlags?: string[]

  /** Timeout in ms for the dev server to report ready. Default 60_000. */
  devServerTimeout?: number

  onPhase?: (phase: RunnerPhase, message?: string) => void
  onLog?: (log: RunnerLog) => void
}

export interface DevServer {
  url: string
  port: number
  stop(): Promise<void>
}

export interface RunResult {
  exitCode: number
  durationMs: number
}

export interface ExtractedFiles {
  /** Relative path under the extracted dir → binary content. Text files decoded from UTF-8. */
  [path: string]: Uint8Array
}
```

```ts
// webcontainer-runner.ts
export class WebContainerRunner {
  constructor(private readonly options: RunnerOptions)

  /** Idempotent. Boots the WebContainer and mounts initial files. */
  async boot(): Promise<void>

  /** Detects the package manager from lockfile (or uses override) and runs install. */
  async install(flagsOverride?: string[]): Promise<RunResult>

  /** Runs any npm script. Streams logs via onLog. */
  async run(script: string, args?: string[]): Promise<RunResult>

  /** Starts a dev server; returns URL once the WebContainer reports ready. */
  async startDevServer(script?: string): Promise<DevServer>

  /** Extracts a directory from the WebContainer FS back to a plain object. */
  async extractDir(path: string): Promise<ExtractedFiles>

  /** Reads a single file. */
  async readFile(path: string): Promise<Uint8Array>

  /** Writes a single file (syncs to initial VFS too if one was provided). */
  async writeFile(path: string, content: Uint8Array | string): Promise<void>

  /** Arbitrary shell command. For advanced callers. */
  async exec(command: string, args: string[]): Promise<RunResult>

  /** Kills the WebContainer and releases the iframe. */
  async destroy(): Promise<void>

  isRunning(): boolean
}
```

---

## Implementation notes

### WebContainer boot

```ts
import { WebContainer } from '@webcontainer/api'
const container = await WebContainer.boot()
```

`.boot()` is **singleton per origin** — two calls on the same page return the same instance. Handle this: if `boot()` is called twice on the same runner, it's fine, but the runner should track state so `destroy()` can be called cleanly.

### File mounting

WebContainer expects a `FileSystemTree`:

```ts
{
  'package.json': { file: { contents: '...' } },
  src: {
    directory: {
      'index.ts': { file: { contents: '...' } },
    },
  },
}
```

`file-mount.ts` converts from your `IVirtualFS` to this shape. Walk the VFS, skip `node_modules`, `.git`, `dist`, `.turbo`, `.cache`, `.next`, `.nuxt`, `.svelte-kit`, `.astro`. Binary files as `Uint8Array`.

### Package manager detection

```ts
// package-manager-detect.ts
export async function detectPackageManager(
  fs: WebContainer,
): Promise<PackageManager> {
  if (await exists(fs, 'pnpm-lock.yaml')) return 'pnpm'
  if (await exists(fs, 'bun.lockb') || await exists(fs, 'bun.lock')) return 'bun'
  if (await exists(fs, 'yarn.lock')) return 'yarn'
  if (await exists(fs, 'package-lock.json')) return 'npm'
  return 'npm'
}
```

After detection, if PM isn't npm you need to `npm install -g pnpm` (or yarn, bun) inside the container first. WebContainer's npm ships with Node — pnpm/yarn/bun don't.

### Dev server URL

WebContainer emits a `'server-ready'` event:

```ts
container.on('server-ready', (port, url) => { ... })
```

`startDevServer` awaits this with a timeout. The URL is something like `https://localhost--abc123.local-credentialless.webcontainer-api.io` — use as-is for the iframe `src`.

### Log streaming

```ts
const process = await container.spawn('npm', ['install', ...flags])
process.output.pipeTo(new WritableStream({
  write(chunk) { onLog?.({ stream: 'stdout', chunk }) }
}))
```

Note: WebContainer does **not** split stdout/stderr on the process output — both come through `process.output`. Document that `stream` will always be `'stdout'` for now, or parse ANSI escape codes to distinguish.

### Extracting output

```ts
async extractDir(path: string): Promise<ExtractedFiles> {
  // Recursively walk `path`, reading each file
  // Use container.fs.readdir and container.fs.readFile
}
```

Return `Uint8Array` for everything. Deploy adapters already accept that.

### Git clone support

Implement `gitClone` option as: on `boot()`, after mounting any initial files, run `git clone <url> .` inside the container. Requires `git` to be on the PATH in WebContainer — it is. For private repos, pass a token via `https://TOKEN@github.com/user/repo.git` URL construction.

---

## Tests

Unit-test pure helpers. Full integration tests that actually boot WebContainer belong in Phase 2+ (they need a real browser; bun test is node-only).

- `package-manager-detect.spec.ts`: mock a fake FS and verify each lockfile → correct PM.
- `file-mount.spec.ts`: build a MemoryFS with a few nested files, convert to FileSystemTree, assert shape.

---

## Package wiring

### `packages/frontend/runtime/package.json`

Add dep:

```json
"dependencies": {
  "@webcontainer/api": "^1.5.0"
}
```

Add subpath export:

```json
"./preview-wc-headless": {
  "import": "./src/preview-wc-headless/index.ts",
  "types": "./src/preview-wc-headless/index.ts"
}
```

### `apps/web/vite.config.ts`

Add to `RUNTIME_SUBPATHS`:

```ts
'@vertex/runtime/preview-wc-headless':
  path.join(runtimeSrc, 'preview-wc-headless/index.ts'),
```

### `apps/web/tsconfig.json`

Add path mapping:

```json
"@vertex/runtime/preview-wc-headless": [
  "../../packages/frontend/runtime/src/preview-wc-headless/index.ts"
]
```

---

## Acceptance criteria

- [ ] `bun --cwd packages/frontend/runtime check-types` passes.
- [ ] `bun --cwd packages/frontend/runtime test` passes (new unit tests green).
- [ ] `bun --cwd apps/web check-types` passes.
- [ ] `import { WebContainerRunner } from '@vertex/runtime/preview-wc-headless'` resolves from `apps/web`.
- [ ] No Angular imports anywhere in `preview-wc-headless/`.
- [ ] No `document.*` or `HTMLIFrameElement` references (it's headless).
- [ ] A small manual-test script (not committed) boots a runner against a Vite React repo cloned via git, does `install`, runs `build`, extracts `/dist`, logs the file list. This proves end-to-end wiring before Phase 2.

---

## Commit strategy

- Commit 1: types + helpers (`types.ts`, `package-manager-detect.ts`, `file-mount.ts`, tests).
- Commit 2: main runner class (`webcontainer-runner.ts`, `output-extract.ts`, `index.ts`).
- Commit 3: package.json + tsconfig + vite.config wiring.
