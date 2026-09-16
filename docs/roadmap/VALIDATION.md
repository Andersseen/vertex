# Validation and release gates

These checks must be built and executed. **They have not passed merely because
this roadmap exists.** Start at the [roadmap](../ROADMAP.md).

## Environment matrix

| Environment | Required | Evidence |
| --- | --- | --- |
| macOS Apple Silicon, Tauri application | Yes | Installed app; FS, processes, permissions, keyboard, Git, full journey |
| Desktop Chromium | Yes | Playwright and manual journey on production build |
| macOS Safari | Editing/recovery and every advertised capability | Actual Safari; Playwright WebKit is supplementary |
| iPad Pro 12.9 M1 with Magic Keyboard | Yes | Physical Safari; keyboard, touch, suspension, certified TS project |
| iPad Home Screen web app | Required to advertise this mode | Separate test; do not assume storage matches Safari |
| Touch phone | Basic editing | Representative physical device plus automated viewports |
| Desktop Firefox | Editing smoke and explicit support matrix | Classify execution limitations by capability |
| Installed macOS Intel / Windows / Linux | Later unless scope expands | A generic successful build is not certification |

Record exact versions in V01-01 and refresh before beta. Test the owner's current
iPad environment and the stable version selected for release; “modern Safari” is
not a reproducible environment description.

## Versioned fixtures

Create `tests/fixtures/projects` in 0.1, recording license/origin where relevant.
Fixtures contain test data, never the owner's private repositories.

| ID | Contents | Purpose |
| --- | --- | --- |
| F01 | HTML/CSS/JS, PNG image, binary font, Unicode names | Bytes, paths, static preview, export |
| F02 | TS imports across files, tsconfig paths, DOM and typed dependency | Assistance, rename, diagnostics, build |
| F03 | Pinned Vite TS and Vite React/TSX projects | Install, HMR, test, build, publish |
| F04 | Small Angular CLI project with pinned lockfile | Required on macOS; browser/iPad per feasibility decision |
| F05 | Local Git history with branches, staged/unstaged states, text/binary conflicts | Git without Internet |
| F06 | Different origins sharing a repository name; interrupted clone | Identity and recovery |
| F07 | 1,000 files / 10 MiB source, 10,000-line file and 1 MiB file | Performance and limits |
| F08 | Invalid JSON, executable configuration, failed scripts, denied writes | Trust and recoverable errors |

Serve network fixtures through deterministic local test infrastructure in CI.
Real GitHub/WebContainers/Cloudflare checks remain separate certification evidence;
they do not replace reproducible regression tests.

## Cumulative acceptance journeys

| ID | Scenario | Blocking from |
| --- | --- | --- |
| A01 | Clone fixture → edit → confirmed save → reload → identical bytes | 0.2 |
| A02 | Same-name repositories and failed clone retries preserve both projects | 0.2 |
| A03 | A → B → undo in B never changes A; rename/delete with pending autosave | 0.3 |
| A04 | macOS: choose folder → edit → save → restart application | 0.4 |
| A05 | Import/export binary assets, Unicode paths, and empty directories | 0.5 |
| A06 | iPad keyboard/touch, rotation, panels, background/resume recovery | 0.6 |
| A07 | Multi-file search/replace with dirty buffers and recovery | 0.7 |
| A08 | TS imports, dependency types, definition, references, safe rename | 0.8 |
| A09 | Terminal and editor changes converge without data loss | 0.9 |
| A10 | Install → preview → edit → visible update → stop/restart without leaks | 0.10 |
| A11 | Correct diff → stage/unstage → commit → protected branch switching | 0.11 |
| A12 | Private clone → commit → push → conflicting pull → resolve/abort | 0.12 |
| A13 | Editor/playground mount/unmount without event echoes or host access | 0.13 |
| A14 | Test/build → identified artifact → Pages publish → verify URL | 0.14 |
| A15 | Application/schema upgrades and storage failures preserve recovery | 0.15 |
| A16 | Complete real-project journeys on macOS/iPad with published limitations | 0.16 |

Each minor retains earlier journeys and adds its own. Merely rendering the layout
or a button does not satisfy a workflow test.

## Cross-cutting failure cases

- Write failure/quota exhaustion leaves the document dirty and permits retry/export.
- Closing during debounce preserves confirmed saves; recovery returns the last
  persisted draft revision. Unconfirmed text is never falsely labeled saved.
- Crash during clone/rename/import/migration resumes or rolls back predictably,
  preserving previous data and avoiding a partially activated workspace.
- Two tabs coordinate writers or open the second view read-only; no silent last-writer
  overwrite of another session's edits.
- Lost network, expired token, missing dependency, failed script: no retry loops or
  source deletion; provide actionable diagnostics and bounded retries.
- Malicious preview cannot read credentials, invoke Tauri, or replace host state.
- Slow responses after workspace switching cannot mutate the new workspace.
- External edits to dirty documents preserve both versions for conflict resolution.
- PWA updates never purge project data to recover from a stale application chunk.

## Initial performance targets

These are **proposed budgets to calibrate in 0.1**, not measured results or claims
about competitors. Use F07 and production builds, record hardware/versions/runtime
state, and measure input latency without an attached debugger altering the result.

| Metric | Initial target |
| --- | --- |
| Key input to next paint | p95 ≤ 50 ms in a 10,000-line document |
| Switch between loaded documents | p95 ≤ 100 ms |
| Open palette with prepared index | p95 ≤ 150 ms |
| Literal search in F07 | First results ≤ 300 ms; complete ≤ 2 s; cancelable |
| Cached web editor startup | Usable ≤ 2 s on reference device |
| macOS startup with local fixture | Usable ≤ 3 s |
| Warm TS completion | p95 ≤ 300 ms in F02 |
| Diagnostics after typing pause | ≤ 1 s in F02 without blocking input |
| Resources after 30 open/close cycles | No monotonic worker/process/listener/view growth |
| Full/lite bundles | Preserve current 1,250 KiB / 500 KiB uncompressed limits; also report compressed transfer |

Measure at least five cold/warm starts per environment and enough interactions for
p95 (at least 100). Separate package installation/network time from editor response.
Do not compare compressed bundle size with resident memory, or Chromium heap with
Safari total memory. Record the available platform-specific memory method; on iPad
also check that the OS does not terminate the certified fixture session.

## Accessibility and input

Automate accessible naming, focus, keyboard operation, critical contrast, and absence
of focus traps. Add manual VoiceOver on macOS/iPad, zoom, touch selection, virtual
keyboard, IME composition, and Spanish accents/dead keys. Browser/OS-reserved shortcuts
always have a visible command alternative.

## CI and release

In 0.1 a deterministic browser smoke becomes required; 0.2 adds real persistence.
Web application deployment depends on these checks, not only lint and unit tests.
Documentation retains its build and can deploy its own tested artifact without
implying the application was certified.

Physical hardware and external credentials cannot be fabricated in CI. Attach their
release evidence and keep missing checks pending. Builds, tests, and distribution
must identify the same commit and the artifacts actually delivered.
