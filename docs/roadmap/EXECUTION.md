# Execution guide for implementation models

Start at the [roadmap](../ROADMAP.md). This document supplies shared rules; each
minor supplies task-specific scope. Every milestone starts pending. Write all
repository documents, evidence, and handoffs in English.

## Work unit

Path shorthand in milestone specifications: `core/src`, `ui/src`, `runtime/src`,
`ide-ui/src`, `editor-core/src`, and `types/src` refer to the corresponding package
under `packages/frontend/`. `evidence/0.x.md` refers to `docs/roadmap/evidence/0.x.md`.
Resolve moved symbols through search before treating a proposed destination as new.

A minor is a product delivery. A task such as `V02-04` is an implementation unit.
Assign one ID, rather than “finish this entire minor.” Split work across complex
layers into `a`, `b`, and `c` subtasks while retaining the parent acceptance criteria.

Prefer one responsibility and a small set of files. If a task is likely to change
more than eight implementation files or two independent migrations, decompose it
before editing. This is a review signal, not a prohibition on required exports,
fixtures, and tests.

## Before implementation

1. Read `AGENTS.md`, the minor specification, relevant contracts, and predecessor
   evidence. Consult `ANGULAR_USAGE.md`/`ANALOGJS_USAGE.md` where applicable.
2. Check Git state and preserve unrelated changes. Do not clean the worktree.
3. Locate the actual symbols using `rg`. Paths may move during extraction; find the
   existing implementation before creating another one.
4. Briefly state old behavior, intended behavior, and the test that distinguishes
   them. Identify unmet dependencies.
5. Run a relevant baseline check and distinguish existing failures from regressions.
6. For data, concurrency, or process work, write down states/events before coding.
   Do not weaken the shared contract for local convenience.

## Implementation rules

- Reuse CodeMirror, Angular, Tauri, and existing headless libraries.
- Keep editor-core independent of Angular/product concerns; runtime independent of
  Angular/Tauri; the standalone editor independent of workbench/runtime packages.
- Use signals and OnPush for UI state. Never introduce a competing authoritative
  document-text store. Dispose subscriptions and owned resources.
- Follow existing selector prefixes and CSS tokens.
- Async operations carry workspace identity and revision where they can outlive a
  file, project, or view transition.
- Preserve recoverable data before rename, delete, workspace switching, or migration.
- Fix failing behavior; do not disable a test or enlarge timeouts to hide a race.
  New integration tests must not replace the whole Angular runtime with mocks.
- Avoid unrelated dependency upgrades, package moves, framework changes, and mass
  formatting unless explicitly required by the task.
- Verify upstream APIs against installed types and official documentation.
- Opening imported code does not authorize execution, package installation, or loading
  executable configuration. Workspace trust must remain explicit in the product.
- Do not introduce remote compute, another cloud provider, or VS Code compatibility
  as a side effect of a 1.0 task.

## Proportionate verification

Use actual repository commands with the required RTK shell prefix:

| Change | Minimum verification |
| --- | --- |
| Package logic | Behavior-focused tests and affected package typecheck |
| Cross-package imports | Above plus `bun run check:boundaries` |
| Angular/editor/view state | Real component/browser tests and production template compilation |
| Persistence | Real browser storage, reload, write failure, and recovery |
| Native processes/macOS | Contract tests and actual binary; Cargo commands with the correct manifest |
| Public editor API | Full/lite build, declarations, size budgets, consumer integration |
| Documentation | Local links, scope consistency, docs build for public-content changes |

From the repository root, current examples are `rtk proxy bun test <path>`,
`rtk proxy bun run check:boundaries`, and `rtk proxy bun web:build`.
For a package-only typecheck, set the working directory to that package (for example,
`packages/frontend/core`) and execute `rtk proxy bun run check-types`.
Do not assume future benchmark/integration scripts exist: their owning task must
create, document, and wire them into CI where required.

Before closing a minor, run lint, types, unit tests, boundaries, affected production
builds, and acceptance journeys. Do not rerun everything for wording-only changes.
[VALIDATION.md](VALIDATION.md) defines mandatory behavioral evidence.

## Status and evidence

Track each task in its milestone evidence file:

- `pending`: no implementation/evidence.
- `in progress`: incomplete implementation or verification.
- `implemented`: code and automated checks complete; physical checks may remain.
- `blocked`: state the exact dependency and independent work still possible.
- `verified`: complete acceptance evidence has been reviewed.

A minor closes when all required tasks are verified. Playwright WebKit does not
turn a pending physical iPad test into a pass. An agent without hardware provides
a runnable fixture and exact manual procedure; the owner supplies physical results.
Independent tasks may proceed while the release dependency remains visible.

Create `docs/roadmap/evidence/0.x.md` when starting a minor. Do not generate fictional
results in advance. Record commit, environment, commands, and outcomes. Redact tokens
and private content; put large artifacts in CI attachments/issues and link them.

## Task assignment template

```text
Implement only [ID and title] from [minor specification].

Read AGENTS.md, docs/ROADMAP.md, docs/roadmap/EXECUTION.md, and the relevant
contracts in docs/roadmap/CONTRACTS.md.

Starting point: [commit and worktree state].
Verified dependencies: [IDs and evidence].
Expected behavior: [specific task acceptance scenario].
Initial paths: [from the task; confirm they still exist].
Applicable decisions: [IDs from DECISIONS.md].
Constraints: [task boundaries and available platforms].

Before editing, identify the current flow and relevant regression test.
Implement a bounded change preserving the shared contracts.
If a product decision is missing, document options and continue only independent
work. Do not invent requirements or expand scope.
Deliver changed files, validation, limitations, and the next enabled task.
Do not mark the entire minor complete after finishing this ID.
```

## Handoff template

```text
Task / status:
Commit or reviewable diff:
Behavior added or corrected:
Changed files and contracts:
Checks / results / environment:
Completed and pending manual tests:
Migrations, recovery, and rollback:
Risks or open decisions:
Next enabled ID:
```

## Review before acceptance

Review the user scenario rather than only the implementer's explanation. Look for
stale reads, swallowed failures, duplicate state, premature deletion, and leaked
secrets. For UI, check keyboard and touch; for storage, interrupt the operation.

Persistence, authentication, native processes, and preview isolation need careful
contract review. This does not require spawning additional agents or repeatedly
requesting permission for already-authorized local work.

## Updating the plan

If research invalidates an assumption, update its decision and dependent milestones
before assigning more dependent implementation. Preserve IDs for traceability.
Do not replace a difficult requirement with a smaller one without an explicit scope
change. Performance targets may be recalibrated using evidence; silent data loss
and credential leakage are never accepted tradeoffs.
