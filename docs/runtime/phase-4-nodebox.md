# Phase 4 - Node.js Runtime (Nodebox)

> **Goal:** Run real `npm install`, execute Node.js scripts, and connect process I/O to the IDE terminal.
> **Prerequisite:** Phases 1, 2, and 3.
> **Estimated duration:** 3-4 weeks
> **Result:** Support for real dependencies (no CDN fallback only), dev servers, and interactive terminal in browser.

---

## Why Nodebox instead of WebContainers

|             | WebContainers                      | Nodebox                               |
| ----------- | ---------------------------------- | ------------------------------------- |
| License     | Private / commercial for some uses | MIT (open source)                     |
| npm install | Full                               | JS-only packages (no native binaries) |
| Node APIs   | ~100%                              | ~80%                                  |
| WASM size   | ~50MB                              | ~15MB                                 |
| Maintenance | StackBlitz                         | CodeSandbox                           |

Nodebox is the baseline. We can fork/extend later if needed.

---

## Install

```bash
bun add @codesandbox/nodebox
```

---

## Files to implement

```
packages/frontend/runtime/src/
|- node/
|  |- nodebox-runtime.ts
|  |- npm-manager.ts
|  |- script-runner.ts
|  |- terminal-bridge.ts
|  '- index.ts
'- types/
   '- node.types.ts
```

---

## Key interfaces

### `node.types.ts`

```typescript
export interface NodeRuntimeOptions {
  files?: Record<string, string>;
  nodeVersion?: string;
}

export interface NpmInstallOptions {
  packages?: string[];
  dev?: boolean;
  exact?: boolean;
}

export interface ScriptRunOptions {
  script: string;
  args?: string[];
  onOutput?: (line: string, type: "stdout" | "stderr") => void;
  onExit?: (code: number) => void;
}

export interface DevServerInfo {
  url: string;
  port: number;
  ready: boolean;
}

export interface INodeRuntime {
  init(options?: NodeRuntimeOptions): Promise<void>;
  install(options?: NpmInstallOptions): Promise<void>;
  run(options: ScriptRunOptions): Promise<number>;
  startDevServer(script: string): Promise<DevServerInfo>;
  writeFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<string>;
  destroy(): Promise<void>;
}
```

---

## Step-by-step implementation

### Step 1 - `nodebox-runtime.ts`

Responsibilities:

- Initialize Nodebox and connect.
- Mount initial files from VirtualFS.
- Run npm commands and scripts.
- Detect dev server readiness from output.
- Sync write operations back to VirtualFS when desired.

Recommended behavior:

- Skip `node_modules` while dumping VirtualFS.
- Use hidden iframe for Nodebox internals.
- Add timeout for dev server startup detection.

---

### Step 2 - `npm-manager.ts`

Responsibilities:

- `installAll()`.
- `addPackage(name, dev)`.
- `removePackage(name)`.
- Keep `package.json` synchronized between Nodebox FS and VirtualFS.

---

### Step 3 - `terminal-bridge.ts`

Responsibilities:

- Pipe terminal input -> Nodebox stdin.
- Pipe Nodebox stdout/stderr -> terminal output.
- Keep shell lifecycle independent from runtime initialization lifecycle.

Minimal adapter contract:

```typescript
export interface TerminalAdapter {
  write(data: string): void;
  onData(callback: (data: string) => void): void;
}
```

---

### Step 4 - `script-runner.ts`

Responsibilities:

- Run scripts (`build`, `test`, `dev`, etc.).
- Capture output lines and exit code.
- Return duration and collected logs.

---

## Integration with web app

Create a runtime service in the web app to:

- initialize Nodebox once,
- expose status signal (`idle | initializing | ready | error`),
- run install/scripts,
- connect existing terminal panel through `TerminalBridge`.

---

## Full flow (Phase 1 -> Phase 4)

```
User opens repo URL
    ->
Phase 1: GitClient.clone() -> files in VirtualFS
    ->
Phase 2: Bundler.build() -> dist/ in VirtualFS (simple projects)
    ->
Phase 4: NodeboxRuntime.init() + install() -> real dev server
    ->
Phase 3: PreviewManager renders in iframe
    ->
User edits files -> hot reload update
```

---

## Acceptance criteria for "Phase 4 complete"

- [ ] `NodeboxRuntime.init()` starts in Chromium and Firefox.
- [ ] `npm install` resolves real dependencies for JS-only packages.
- [ ] `npm run dev` starts and exposes a reachable URL.
- [ ] `npm run build` generates `dist/` usable by PreviewManager.
- [ ] IDE terminal is connected via `TerminalBridge`.
- [ ] File edits can be propagated to running dev flow.
- [ ] Runtime cleanup works when workspace/session is closed.
- [ ] Works with React, Vue, and Vite vanilla projects.

---

## Known limitations

- Native/binary packages do not work (`better-sqlite3`, Prisma binaries, etc.).
- Limited `child_process` behavior.
- No host OS filesystem access.
- Angular CLI and Next.js SSR require separate validation paths.
