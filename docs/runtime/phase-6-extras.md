# Phase 6 - Extras (CSS, TypeScript Checker, ESLint)

> **Goal:** Add browser-native code quality and styling tooling to the IDE.
> **Prerequisite:** Optional. Can be developed in parallel with other phases.
> **Estimated duration:** Open-ended
> **Note:** This phase is not a blocker for Phases 1-5.

---

## Available extras (independent)

Each extra can be added independently. Implement only what your target projects need.

---

## Extra A - PostCSS + Tailwind in browser

### When to add

When projects require Tailwind processing during build/preview.

### Suggested deps

```bash
bun add postcss autoprefixer
```

### Runtime role

- Process CSS in-browser.
- Apply autoprefixer.
- Add Tailwind support path when browser-compatible API is stable.

---

## Extra B - TypeScript type checker

### When to add

When you want real type diagnostics in editor (not only transpile/build errors).

### Suggested deps

```bash
bun add typescript
```

### Runtime role

- Use TS Language Service in browser.
- Track file versions.
- Expose per-file and full-project diagnostics.
- Integrate with editor diagnostics rendering.

Recommended diagnostic shape:

```typescript
export interface TypeCheckError {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning";
}
```

---

## Extra C - ESLint in browser

### When to add

When you want live lint feedback while editing.

### Suggested deps

```bash
bun add eslint
```

### Runtime role

- Run `Linter` API in browser.
- Apply baseline flat config rules.
- Return lint diagnostics that can be rendered inline.

---

## Extra D - Sass / SCSS support

### When to add

When projects include `.scss` / `.sass` styles.

### Suggested deps

```bash
bun add sass
```

### Runtime role

- Compile SCSS to CSS in browser.
- Resolve imports from VirtualFS.
- Feed output into bundler CSS pipeline.

---

## Extra E - Prettier in browser

### When to add

When you want format-on-save behavior in the IDE.

### Suggested deps

```bash
bun add prettier
```

### Runtime role

- Format TS/JS/CSS/HTML/JSON from browser.
- Use standalone Prettier + parser plugins.
- Provide command/action hook from editor UI.

---

## Summary table

| Extra                  | Use case                | Complexity | Packages                  |
| ---------------------- | ----------------------- | ---------- | ------------------------- |
| A - PostCSS/Tailwind   | Tailwind projects       | Low        | `postcss`, `autoprefixer` |
| B - TypeScript Checker | Editor type diagnostics | Medium     | `typescript`              |
| C - ESLint             | Live linting            | Low        | `eslint`                  |
| D - Sass/SCSS          | SCSS projects           | Low        | `sass`                    |
| E - Prettier           | Format-on-save          | Low        | `prettier`                |

---

## Runtime exports (final shape)

```typescript
// Phase 1
export { VirtualFS, MemoryFS, OPFSFS } from "./fs/virtual-fs";
export { GitClient } from "./git/git-client";

// Phase 2
export { Bundler } from "./build/bundler";

// Phase 3
export { PreviewManager } from "./preview/iframe-manager";

// Phase 4
export { NodeboxRuntime } from "./node/nodebox-runtime";
export { NpmManager } from "./node/npm-manager";
export { TerminalBridge } from "./node/terminal-bridge";

// Phase 5
export { DeployManager } from "./deploy/deploy-manager";

// Phase 6 (subpath imports are fine)
// import { TypeScriptChecker } from '@vertex/runtime/types'
// import { ESLintRunner } from '@vertex/runtime/lint'
// import { formatCode } from '@vertex/runtime/format'
// import { compileSass } from '@vertex/runtime/css'
```

---

## Acceptance criteria for "Phase 6 complete"

Per extra:

- [ ] A: CSS pipeline handles PostCSS/Tailwind as expected.
- [ ] B: Type errors appear in editor with line/column mapping.
- [ ] C: ESLint warnings/errors update in near real time.
- [ ] D: `.scss` files compile correctly through runtime path.
- [ ] E: Prettier formatting can be triggered from editor action.
