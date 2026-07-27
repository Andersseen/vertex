# Editor foundation

This document is the delivery checklist for a useful, stable editor family.
It deliberately separates editor quality from workbench/runtime features.

## Shared editor baseline

- [x] Framework-independent CodeMirror configuration package.
- [x] Separate compact web and broad workbench language profiles.
- [x] Lazy, cached language resolution.
- [x] Shared change, cursor, save, theme, readonly, wrapping, and line-number behavior.
- [x] Package-boundary checks in CI.
- [x] Dynamic viewport, safe-area, touch scrolling, and coarse-pointer baseline.
- [ ] IME composition tests.
- [ ] iPad hardware-keyboard shortcut tests.
- [ ] Accessibility tests with AXE and VoiceOver.
- [ ] Performance budgets for startup, typing latency, and memory.

## Embeddable web editor

Scope: display or edit code inside another product.

- [x] Full editable and native read-only entry points.
- [x] Value, language, theme, line-number, wrap, readonly, and sizing controls.
- [x] Programmatic `getValue`, `setValue`, and `focus`.
- [x] Ready, value-change, and cursor events.
- [x] Accessible CodeMirror label and readonly state.
- [x] One canonical documented and typed API contract covering full and lite distributions.
- [ ] Browser integration tests in plain HTML, Angular, React, and Vue.
- [x] Explicit full/lite bundle budgets checked by the package build.
- [x] CSS custom-property reference and stable theming contract.
- [ ] Decide whether full/lite remain separate distributions after measuring them.

The web editor must never acquire imports from `@vertex/runtime`,
`@vertex/core`, `@vertex/ui`, or `@vertex/ide-ui`.

## Browser workbench

Scope: complete project workflows in a browser.

- [x] Workspace tree, tabs, editing, autosave, and session restoration.
- [x] OPFS repository persistence.
- [x] WebContainer preview foundation.
- [ ] Capability detection with graceful fallback for filesystem, Git, build,
      and WebContainers.
- [ ] Project-wide search and command palette.
- [ ] Recovery UX for storage eviction, failed clone, and failed install.
- [ ] Blocking E2E smoke test for clone → edit → reload → restore.
- [ ] Git status/diff UI before advertising a complete Git workflow.
- [ ] Tablet navigation model for sidebar and bottom panel.

Preview belongs here, not in editor-core or the web component.

## Installed Tauri workbench

Scope: native filesystem/process integration for desktop and later supported
tablet/mobile targets.

- [x] Tauri shell and native filesystem/terminal bridge foundations.
- [ ] Replace duplicated application state with shared workbench controllers.
- [ ] Define one typed platform-adapter contract.
- [ ] Use the Rust bridge for native capabilities; keep product logic in
      TypeScript unless profiling justifies moving it.
- [ ] Validate lifecycle, suspend/resume, orientation, and keyboard behavior on
      physical tablet hardware.
- [ ] Remove obsolete duplicate Node/JavaScript terminal implementations after
      the adapter migration.

## Quality gates

A product surface is not called stable until:

1. lint, typecheck, unit tests, and its production build pass;
2. one real-browser smoke journey is blocking in CI;
3. its public capability claims match integrated UI;
4. it handles unavailable platform capabilities without losing edits;
5. bundle and interaction budgets are measured, not assumed.

## Documentation

- [x] Separate Starlight application for public product and API documentation.
- [x] Repository, app, and package READMEs state ownership and dependency boundaries.
- [x] Docs build consumes the generated web-editor bundle.
- [x] Docs build runs in CI.
- [ ] Choose the production docs hostname and Cloudflare Pages release policy.
- [ ] Add automated link checking and a browser smoke test for the interactive editor example.
