# Vertex roadmap to version 1.0

Planning date: 2026-09-16. Status: **execution plan; milestones are pending**.
All repository documentation and implementation handoffs must be written in English.

The current codebase is the roadmap's **0.0 baseline**; 0.1 is the first planned
milestone. This planning label does not change existing package versions or declare
a previously published release.

## 1. Product vision

Vertex is **one code editor with IDE capabilities, delivered through several
surfaces**. It combines responsive editing with the tools needed to develop
JavaScript/TypeScript web projects. Zed and VS Code are product references; 1.0
does not promise feature parity or superior performance without comparable measurements.

- CodeMirror provides editing state, text operations, and input primitives.
- Angular organizes the workbench: state, commands, panels, and composition.
- Tauri provides native capabilities for the macOS application.
- The browser allows project work without installing Vertex.
- An iPad Pro 12.9 M1 with Magic Keyboard is a primary target device.
- Custom elements provide editing and code display inside other products.
- An embedded project playground composes the workbench and runtime, while the
  standalone editor remains independent.

Documents, commands, and concepts should remain consistent across surfaces.
Capabilities can differ: a native terminal and a runtime inside Safari are not
interchangeable environments.

## 2. Version 1.0 scope

| Area | Commitment |
| --- | --- |
| Primary languages | JavaScript, TypeScript, JSX, and TSX |
| Supporting files | HTML, CSS, JSON, and Markdown; editing, highlighting, and the tooling specified in 0.8 |
| Desktop | macOS first, explicitly confirmed by the owner; Apple Silicon is the reference device |
| Browser | Desktop Chromium and Safari/iPadOS for declared workflows; Firefox is tested with explicit capability limitations |
| Tablet | Physical iPad with Magic Keyboard and touch input; Safari first, Home Screen web app validated separately |
| Phone | Open, navigate, edit, and save through an adapted interface; full desktop workbench parity is not required |
| Projects | One active root per window; multiple stored projects and safe switching |
| Git | Public/private GitHub HTTPS repositories, status, diff, staging, commits, branches, fetch, push, pull, and basic conflict resolution |
| Dependencies | npm is certified; other lockfiles are detected with honest support messages, never silently converted |
| Runtime | Available native Node/npm on macOS; WebContainers where validated; an explicitly limited static preview alternative |
| Delivery | Artifact export and an integrated static-site publishing workflow to Cloudflare Pages |
| Embedding | Stable full/lite editor and an iframe workbench with a bounded host protocol |
| VS Code extensions | Outside 1.0; investigation and selected compatibility belong to 2.0 |

**The certified web execution scope is frontend development.** Creating and
maintaining a static site or SPA is mandatory. Users can edit Node.js projects and
run compatible scripts, but 1.0 does not certify persistent backends, databases,
Docker, native Node modules, arbitrary monorepos, or every framework's SSR mode.

Certify pinned templates: static HTML/CSS/JS, framework-free TypeScript, Vite with
TypeScript, and Vite with React/TSX. Angular CLI must work on macOS; browser/iPad
execution is decided from evidence in 0.1 and published in the support matrix.
Using Angular to build Vertex does not automatically provide advanced Angular
project-template language intelligence.

Existing Python/Rust highlighting may remain experimental. Do not add their
language servers, toolchains, or product guarantees during this roadmap.

### After 1.0

Installed Windows/Linux, native iPadOS/App Store distribution, additional languages,
real-time collaboration, Vertex cloud accounts/file synchronization, a marketplace,
integrated AI assistants, a general DAP debugger, containers, multi-root workspaces,
advanced Git (interactive rebase, submodules, LFS), additional certified package
managers, and deployment of user backends/Workers.

Existing adapters can remain where useful. Their presence does not make their
capabilities a stable 1.0 commitment.

## 3. What makes 1.0 usable

A user must be able to complete these documented workflows:

1. **macOS:** create/open a folder, install dependencies, edit with TS/JS assistance,
   run dev/test/build, inspect failures, version changes, and publish.
2. **Browser:** create/clone a certified project, edit, preview changes, run supported
   scripts, close/reopen, and recover confirmed work.
3. **iPad:** complete that workflow for at least one certified TS template, including
   keyboard, touch, rotation, and suspension; preserve/export files if the runtime fails.
4. **Git:** clone an owned repository, review and commit a change, push it, retrieve
   remote changes, and resolve a text conflict without losing either version.
5. **Embedding:** install a pinned editor release, control its value/events, and open
   an embedded demo that executes a supported project.
6. **Recovery:** distinguish pending, confirmed, and failed saves; recover drafts and
   export data before destructive operations.

Installing new packages, accessing GitHub, and publishing require connectivity.
Editing already available local projects must survive network loss. Browser storage
is never described as an external backup.

## 4. Delivery sequence

Each row is a product milestone, not an instruction to bump every package version
now. Existing package versions do not prove these milestones are complete. Each
minor contains independently reviewable tasks; assign one task at a time to a
limited model. Task specifications include observable acceptance criteria.

| Minor | Observable result | Entry dependency | Specification |
| --- | --- | --- | --- |
| 0.1 | Verifiable baseline and actual iPad feasibility | Current repository | [Foundation and feasibility](roadmap/0.1-foundation.md) |
| 0.2 | Safe files, cloning, and recoverable drafts | 0.1 | [Data integrity](roadmap/0.2-data-integrity.md) |
| 0.3 | Shared editing session and correct per-document undo | 0.2 | [Shared workbench](roadmap/0.3-workbench.md) |
| 0.4 | Open/save local projects in the macOS application | 0.3 | [macOS platform](roadmap/0.4-macos.md) |
| 0.5 | Create, import, export, and organize projects | 0.4 | [Projects and explorer](roadmap/0.5-projects.md) |
| 0.6 | Comfortable keyboard, touch, and small-screen interaction | 0.5 | [Tablet and commands](roadmap/0.6-tablet.md) |
| 0.7 | Efficient code navigation, search, and editing | 0.6 | [Editing and search](roadmap/0.7-editing.md) |
| 0.8 | Project-aware TS/JS assistance, formatting, and diagnostics | 0.7 | [Language tooling](roadmap/0.8-language-tools.md) |
| 0.9 | Terminal and scripts share the same project/runtime | 0.8 | [Runtime and tasks](roadmap/0.9-runtime.md) |
| 0.10 | Live preview, builds, and web-application diagnostics | 0.9 | [Preview and build](roadmap/0.10-preview.md) |
| 0.11 | Review and preserve local Git history | 0.10 | [Local Git](roadmap/0.11-local-git.md) |
| 0.12 | Synchronize remote repositories and resolve conflicts | 0.11 | [Remote Git](roadmap/0.12-remote-git.md) |
| 0.13 | Embed the editor and projects in other platforms | 0.12 | [Web embedding](roadmap/0.13-embedding.md) |
| 0.14 | Test and publish a project from Vertex | 0.13 | [Project delivery](roadmap/0.14-delivery.md) |
| 0.15 | Performance, recovery, and distribution ready for beta | 0.14 | [Hardening](roadmap/0.15-hardening.md) |
| 0.16 | Real-project beta and release candidates | 0.15 | [Beta and release](roadmap/0.16-beta.md) |
| 1.0 | Certified workflows, reproducible artifacts, defined support | 0.16 and all gates | [1.0 acceptance](roadmap/1.0-release.md) |

The default sequence is intentionally linear to support execution by limited models.
Later designs/fixtures may be prepared early; dependent milestones cannot be closed
with unresolved prerequisites. Initial platform research is bounded and front-loaded.
An unresolved physical runtime check does not prevent independent data-safety fixes,
but it remains a release dependency rather than a silently waived requirement.

Early usability checkpoints: 0.5 for persistent editing; 0.8 for assisted editing;
0.10 for running frontend projects; 0.12 for connected GitHub work; 0.14 for delivery.
Use those versions with the owner instead of waiting for 1.0 to get feedback.

## 5. Execution instructions

1. Read the [model execution guide](roadmap/EXECUTION.md).
2. Follow the [contracts and state ownership](roadmap/CONTRACTS.md).
3. Select the first pending task whose actual prerequisites are verified.
4. Run its checks and the shared [validation gates](roadmap/VALIDATION.md).
5. Leave evidence and a handoff; update completion state only after review.
6. Resolve external decisions through the [decision register](roadmap/DECISIONS.md).

New filenames in tasks are **proposed destinations**, not claims that those files
already exist. Search for an equivalent implementation before creating one. Extend
existing modules and extract responsibilities incrementally.

## 6. Risks that can change the plan

- **iPad/runtime:** do not assume arbitrary Node projects run in Safari. The 0.1
  experiment must establish a certifiable path. If no path supports the promised
  iPad TS workflow, escalate the product decision; do not quietly replace it with
  editing without execution.
- **Persistence:** the current `OPFSFS` adapter uses LightningFS/IndexedDB. Correct
  identity, byte handling, revisions, and recovery before changing storage technology.
  A native OPFS migration is not a required 1.0 objective.
- **External services:** Git, packages, browser execution, and publication can depend
  on network services. Document destinations and failure behavior.
- **Authentication:** GitHub/Cloudflare credentials never reach executed project code
  or a generic public proxy. A narrow, controlled gateway may mediate specific requests;
  it does not host project runtimes.
- **Distribution:** signing, notarization, accounts, and physical devices require
  external evidence. A model cannot claim those checks passed without access.
- **Performance:** budgets are proposed targets, not measured results. Establish the
  fixture/device baseline in 0.1 and verify it throughout development.

## 7. Observed baseline and primary sources

The initial review found enforced package boundaries and 142 passing unit tests,
with gaps in repository identity, deferred saving, renames, binary handling, preview
synchronization, and integration coverage. This is a repository snapshot at planning
time, not certification of future capabilities.

Official sources consulted on 2026-09-16:

- VS Code documents web use in Safari and on mobile devices. Vertex's opportunity
  must be validated through interaction quality and complete iPad workflows, rather
  than the premise that no web editor exists there.
  [VS Code for the Web](https://code.visualstudio.com/docs/remote/vscode-web).
- WebContainers documents browser requirements and limitations, but its support guide
  still carries a February 2023 update date. Treat it as technical context, not a
  currently certified iPadOS matrix.
  [Browser support](https://webcontainers.io/guides/browser-support).
- Check installed types and current documentation before implementing runtime
  lifecycle operations. [WebContainer API](https://webcontainers.io/api).
- Commercial API usage has specific conditions; reassess applicability if Vertex's
  distribution/business model changes before release.
  [Commercial usage](https://webcontainers.io/enterprise).
- Installed distribution requires platform-specific artifacts and signing.
  [Tauri distribution](https://v2.tauri.app/distribute/).
- Pages accepts prebuilt artifacts, matching the existing deployment direction.
  [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).
- Web and Node-dependent extensions have different constraints. For 2.0, a target
  of “50% compatible” requires a fixed corpus of versions and tested features,
  reported separately by platform.
  [VS Code web extensions](https://code.visualstudio.com/api/extension-guides/web-extensions).

No delivery dates are committed. Estimate calendar duration after measuring the
throughput and review cost of the first milestones.
