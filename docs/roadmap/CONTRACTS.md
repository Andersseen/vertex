# Version 1.0 design contracts

These are requirements to implement incrementally, not descriptions of APIs that
already exist. [0.2](0.2-data-integrity.md) and [0.3](0.3-workbench.md) establish the
concrete types without requiring a wholesale rewrite. Start at the [roadmap](../ROADMAP.md).

## C1. Ownership and dependency direction

| Layer | Owns | Must not own |
| --- | --- | --- |
| `@vertex/types` | Serializable workspace/document/operation/capability contracts | Angular, CodeMirror, FS implementations |
| `@vertex/editor-core` | CodeMirror configuration/state, profiles, text commands | Git, storage, Angular, project runtimes |
| `@vertex/ide-ui` | Presentation and interaction primitives | Workspace business rules |
| `@vertex/ui` | Shared document views, panels, visual composition | Another authoritative project session |
| `@vertex/core` | Shared Angular controllers, document coordination, adapters | Per-application copies of product logic |
| `@vertex/runtime` | Angular-free browser FS/Git/language/build/preview | Tauri APIs or application source |
| `apps/web` | Browser adapter registration, routes, bootstrap, composition | Duplicated document controller |
| `apps/desktop` | Native registration, Tauri, lifecycle, distribution | Reimplementation of the editor |
| `@vertex/web-editor` | Full/lite API and embedded presentation | Transitive workbench/runtime/terminal dependencies |

Server-side transport/auth, if required, lives separately at the proposed
`packages/backend/gateway` destination. Create it only after [D04](DECISIONS.md)
has a validated design. Cloudflare remains the only cloud platform.

## C2. Identity and paths

- `workspaceId` is a persistent opaque identity, never just a repository name.
- Metadata includes display name, normalized origin, storage kind, root, and schema
  version. `owner-a/demo` and `owner-b/demo` are different projects.
- `documentId` remains stable across rename; path is mutable metadata.
- Internal paths are workspace-relative with one normalization policy. Reject root
  escapes, invalid entries, and unauthorized targets; preserve original case.
- Native adapters handle symlinks and filesystem case sensitivity. Git uses the same
  root and path convention. OS permissions remain authoritative.
- Requests/events carry workspace identity. Ignore obsolete results after switching.

## C3. Reads, writes, and revisions

Separate byte operations from text operations. Binary assets must never pass through
UTF-8 decoding during copy, rename, export, mounting, or publication. Text metadata
records supported encoding and line endings; unknown encodings receive read-only or
download handling rather than destructive automatic conversion.

A document tracks its current revision, confirmed saved revision, and persistence
error. “Saved” means that exact revision was confirmed. A stale write completion
cannot mark newer content clean.

Serialize writes by workspace/document. Rename, delete, Git mutations, and multi-file
replacement use the same coordinator. Timers retain identity rather than an unchecked
mutable path. Closing a view does not discard a failed write.

Preserve recovery data before replacing content. Use native atomic operations where
available; changes spanning separate stores need a journal and idempotent recovery.
A sequence of Promises is not a cross-store atomic transaction.

## C4. Workspaces, documents, and views

The shared controller owns open documents, active identity, revisions, and operations.
CodeMirror retains per-document editing state. Views own scroll/focus/selection;
a split editor must not create divergent copies of document text.

Switching tabs never inserts document B into document A's undo history. Undo/redo
remain document-local. Theme/language changes and showing preview avoid unnecessary
view reconstruction and preserve selection/IME.

Session tabs remain intentionally volatile in `sessionStorage` unless a later decision
changes that contract. Projects and recoverable drafts persist separately. Recovering
a draft does not require the original browser tab to survive.

## C5. Platform capabilities

Adapters declare individual capabilities with available/unavailable/error state and
user-facing reasons: persistence, native folders, processes, terminal, browser runtime,
static preview, remote Git, publication, and recovery.

Probe the relevant operation; user-agent detection is not proof of support. Execution
failure must not disable editing/export. Native implementations remain platform-owned;
the browser runtime stays independent of Tauri.

## C6. Runtime and synchronization

One session owner per active workspace coordinates boot, installation, processes,
and shutdown. Terminal, tasks, and preview share that session. Minimum lifecycle:
inactive, booting, mounting, installing, ready, running, stopping, failed. Assign an
identity to each start generation to reject obsolete callbacks.

Persistent storage is the durable reference; the browser runtime holds an executable
copy. Explicit synchronization must:

1. Mount a consistent snapshot after pending writes are confirmed.
2. Transfer creates, edits, renames, and deletes in order with revision information.
3. Ingest terminal/tool changes and surface conflicts with dirty editor buffers.
4. Prevent feedback loops using operation/source identity.
5. Exclude `.git`, `node_modules`, and regenerable output where appropriate; preserve
   relevant manifest, lockfile, and source changes.
6. Establish a synchronization barrier before test, build, commit, or export.

If the runtime cannot observe every change, implement and measure bounded
reconciliation at explicit checkpoints. Do not advertise complete synchronization
without testing a terminal command that modifies a source file.

Native terminal ownership includes child handles, incremental output decoding,
cancellation, exit observation, and cleanup. Removing a terminal ID alone is not
process termination.

## C7. Language tooling and asynchronous editing

Use the TypeScript Language Service initially; do not imply an external LSP server
already exists. Index project sources, tsconfig, standard libraries, and supported
dependency declarations. Keep a small provider interface that permits later alternatives,
without building a universal language platform now.

Heavy work runs in a web worker or suitable process. Requests carry document identity,
revision, and cancellation. Completion, formatting, and rename never apply stale
results. Multi-file edits pass through C3.

## C8. Commands and configuration

An internal command registry associates stable ID, label, availability, handler,
and contextual keybindings. Menus, palette, toolbar, and shortcuts invoke the same
action. This registry is not an emulation of the `vscode` API.

Settings precedence: defaults, user preferences, project configuration, temporary
view overrides. Only validated data configuration is read automatically; executable
configuration requires a trusted workspace.

## C9. Trust and secrets

Opening a repository permits reading/editing, not automatic execution of scripts.
Execution follows a deliberate action identifying the project/runtime. Trust does
not transfer between projects sharing a display name.

Credentials default to session memory. Optional persistence uses suitable platform
credential storage, never project files, logs, or localStorage. Project preview/worker
code never receives IDE Git or deployment credentials.

A gateway limits providers/routes and validates destinations, redirects, origin,
session/authorization, limits, and cancellation. CORS does not replace authentication.
Do not log private repository bodies or Authorization; never accept arbitrary URLs
that turn the service into an open proxy.

Project preview is isolated from the workbench origin and privileges. In Tauri it
cannot invoke native commands. Validate postMessage origin, source window, type,
version, and size. Static preview with an opaque origin needs a dedicated channel
and source/nonce validation; an origin of `null` does not authenticate the sender.

## C10. Git mutations and conflicts

Serialize Git operations per repository. Coordinate dirty buffers before mutating
the working tree. Stop before mutation when unresolved data would be overwritten.

Diff distinguishes HEAD, index, and working tree. Conflict handling retains base,
local, remote, and resolved versions; binary resolution requires an explicit choice.
Pull never silently discards edits or uses force/reset as automatic recovery. Push
never forces by default.

## C11. Embedded editor and workbench

`<vertex-editor>` and `<vertex-editor-lite>` preserve their documented public
attributes, properties, methods, events, and tokens. The host controls value and
lifecycle; user/programmatic change semantics prevent infinite event echoes.
Unmount releases resources.

Project execution uses an iframe workbench with a small versioned bridge: ready,
load project, changes, error, run request, and dispose. Filesystem/Git/runtime do
not enter the editor bundle. Loading a project does not authorize execution;
host authentication is not passed through.

## C12. Publication and versioning

Publication uses a successful build tied to a revision/snapshot, an explicit output
directory, and a visible destination. Never publish the workspace root by default.
Secrets, `.git`, and dependencies are not deployment artifacts.

A Vertex release fixes versions, artifact manifest, and upgrade/recovery procedure.
Embedded bundles have immutable versioned URLs; `latest` may remain a convenience,
but cannot be the only installation mode.
