---
title: Roadmap
description: The planned minor releases leading to a usable JavaScript and TypeScript IDE across macOS, browser, and iPad.
---

Vertex is one code editor with IDE capabilities, delivered through native, browser,
and embedded surfaces. Version 1.0 focuses on JavaScript/TypeScript web projects,
macOS-first desktop delivery, and a useful physical iPad experience with Magic Keyboard.
Windows/Linux installed applications and VS Code extension compatibility follow later.

This is a **plan, not a list of completed releases**. Existing editing/runtime modules
provide the foundation; each milestone requires its own integration and acceptance evidence.

## Planned milestones

| Version | User outcome |
| --- | --- |
| 0.1 | Verifiable baseline, blocking browser smoke, and actual iPad runtime feasibility |
| 0.2 | Safe project identity, byte-preserving files, transactional clone, and recoverable drafts |
| 0.3 | Shared workbench session and correct per-document undo, selection, and lifecycle |
| 0.4 | Native macOS filesystem, permissions, toolchain detection, and application lifecycle |
| 0.5 | Create/import/export projects and complete explorer operations |
| 0.6 | Command palette, adaptive panels, keyboard/touch input, and physical iPad validation |
| 0.7 | Productive editing, quick open, project search/replace, preferences, and editor groups |
| 0.8 | Project-aware TS/JS completion, navigation, diagnostics, rename, formatting, and lint |
| 0.9 | Shared runtime, real supported terminals, task execution, and two-way source synchronization |
| 0.10 | Live preview, isolated project execution, useful console/errors, and verified build artifacts |
| 0.11 | Local Git status, diffs, staging, commits, branches, and history |
| 0.12 | Safe GitHub authentication, clone/fetch/push/pull, and conflict resolution |
| 0.13 | Stable full/lite editor distribution and a separately embedded project playground |
| 0.14 | Project verification and integrated static-site publication to Cloudflare Pages |
| 0.15 | Performance, recovery, accessibility, trust boundaries, and macOS release artifacts |
| 0.16 | Real-project beta, fixed workflow blockers, and verified release candidates |
| 1.0 | Certified workflows, published support matrix, and maintainable releases |

## What 1.0 must accomplish

Users can create or open a supported web project, edit with JS/TS assistance, run its
supported scripts, preview/debug failures, review/version changes, and deliver a
static build. Confirmed work survives reopening and recoverable failures. The editor
can also be consumed independently through its public custom-element API.

Browser capabilities are tested individually. Physical iPad runtime feasibility is
an early decision gate, not an assumption deferred until release. A limited static
preview is never presented as an unrestricted Node terminal. Public templates and
support documentation identify the combinations that were actually tested.

HTML, CSS, JSON, and Markdown support web development. Broad non-JS toolchains,
persistent backend hosting, arbitrary monorepos, a general debugger/extension host,
and native mobile distribution are outside the initial stable commitment.

## Implementation specifications

The repository contains the canonical, detailed plan:

- [Version 1.0 roadmap and individual minor specifications](https://github.com/Andersseen/vertex/blob/main/docs/ROADMAP.md).
- [Task execution and model handoff guide](https://github.com/Andersseen/vertex/blob/main/docs/roadmap/EXECUTION.md).
- [Shared implementation contracts](https://github.com/Andersseen/vertex/blob/main/docs/roadmap/CONTRACTS.md).
- [Fixtures, device matrix, and release gates](https://github.com/Andersseen/vertex/blob/main/docs/roadmap/VALIDATION.md).
- [Confirmed decisions and assumptions requiring evidence](https://github.com/Andersseen/vertex/blob/main/docs/roadmap/DECISIONS.md).

Each task defines initial code locations, bounded behavior, and acceptance criteria.
Milestones close through evidence rather than feature counts or package version numbers.
No delivery dates are committed before the initial throughput and platform risks are measured.

## After 1.0

Windows/Linux installed support, additional languages and project profiles, advanced
Git/debugging, and other features follow actual user needs. Version 2 explores selected
VS Code extension compatibility. A percentage target requires a fixed extension corpus
and behavioral tests per platform; it is not a version 1.0 promise.
