# Decisions and assumptions

Start at the [roadmap](../ROADMAP.md). `Confirmed` means explicitly specified by
the owner. `Proposed` means the design default used to make this plan actionable;
review it in its owning task rather than treating it as an existing implementation.
`Validation pending` means evidence is missing and must not be invented.

| ID | State | Decision or proposal | Resolution point |
| --- | --- | --- | --- |
| D01 | Confirmed | One editor/IDE across desktop, browser, and custom elements; CodeMirror + Angular + Tauri | Every milestone |
| D02 | Confirmed | macOS first for installed 1.0; Windows/Linux later | 0.4 and 0.15 |
| D03 | Confirmed | JS/TS first; VS Code compatibility belongs to 2.0 | Do not expand during 1.0 |
| D04 | Proposed | Controlled transport for GitHub/publication when direct access cannot satisfy CORS/security | Investigate in 0.1; settle before 0.12 |
| D05 | Validation pending | Certified iPad M1 execution path: WebContainers and/or bounded static TS preview | V01-04, before dependent runtime work |
| D06 | Proposed | macOS Apple Silicon is the required reference artifact; Intel needs additional evidence/hardware | Matrix in V01-01; review in 0.15 |
| D07 | Proposed | npm and pinned templates are the baseline; other managers are detected, not certified | 0.1 and 0.9 |
| D08 | Proposed | GitHub HTTPS first, least-privilege session token; custom OAuth/other hosts later | Transport in 0.1; implementation in 0.12 |
| D09 | Proposed | Integrated static-site deployment to Cloudflare Pages; user backends/Workers later | 0.14 |
| D10 | Proposed | Full/lite editor separate from iframe workbench embedding | 0.13 |
| D11 | Proposed | User-provided Node/npm/Git on macOS with detection/guidance; no bundled runtime in 1.0 | 0.4 |
| D12 | Proposed | Console, diagnostics, sourcemaps, and browser tools are the debugging baseline; general DAP later | 0.10 and 0.14 |
| D13 | Proposed | One root per window; no proprietary file cloud or automatic cross-device sync | 0.2 and 0.5 |
| D14 | Proposed | Signed releases with safe guided manual updates; no silent updater in 1.0 | 0.15 |

## D05: iPad feasibility decision

Physical testing records exact iPadOS/Safari version, browser/Home Screen mode,
hardware, fixture, network, boot, editing, preview, and recovery after backgrounding.

1. If WebContainers passes, certify those fixtures and retain capability detection.
2. If larger toolchains fail but static TS build supports a useful workflow, describe
   its boundaries and review the experience with the owner. Do not call it a full
   Node terminal.
3. If no path supports the central execution workflow, present evidence and options:
   narrow supported projects, change adapter, or investigate optional remote execution.
   Remote execution requires a separate product decision; this roadmap does not
   authorize introducing a remote compute product as an implicit fallback.

The minimum iPad 1.0 requirement stays open until the owner accepts the resulting
matrix. Independent implementation may continue, but this release gate cannot be
marked complete by inference.

## D04/D08: transport and accounts

Research tests HTTPS Git clone/push from a real origin, private authentication,
redirects, failures, payload size, and cancellation. A proposed gateway is a narrow
Worker controlled by the Vertex deployment/operator, separate from preview. It is
not a generic public CORS proxy.

A session GitHub token provides an initial workflow without Vertex accounts. If
that approach cannot satisfy safety/usability, document OAuth/GitHub App costs and
update 0.12 before assigning dependent work. Record real accounts/credentials as
external dependencies; never put them in the repository or fabricate production tests.

## D12: debugging on iPad

“Open desktop DevTools” alone does not solve iPad debugging. Version 1.0 requires
build errors linked to source, preview console, runtime errors, and useful stack/
sourcemap navigation for certified fixtures. If observed critical workflows need
breakpoints, raise an explicit scope change rather than concealing that difference
from VS Code.

## D14: distribution

The owner supplies signing/notarization identity and a release channel. Pipeline
code and unsigned development artifacts can be prepared without secrets; stable
release requires a verified installation. A local unsigned binary is development
evidence, not proof that stable distribution is complete.

## Version 2 and extension compatibility

Keep the ambition of at least 50% compatibility as a research target. A meaningful
contract needs a fixed extension/version corpus, representative tasks, permissions,
Node dependencies, and platforms. Measure “installs” separately from “core features
work.” Do not install/copy extension packages during 1.0 milestones to imply progress.

## Recording another decision

Record ID, date, evidence, options, owner decision where needed, consequences,
affected milestones, and a condition for reconsideration. Routine implementation
choices within an agreed contract can be resolved without repeated approval requests.
