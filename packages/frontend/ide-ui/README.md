# @vertex/ide-ui

Reusable IDE presentation primitives with headless interaction logic and CSS
custom-property theming.

Components use the `v-` selector prefix and expose `--ide-*` tokens. Complex
interaction behavior comes from `quartz-headless`; button, tabs, and dialog
factories come from `@andersseen/headless-components`.

This package does not own product workflows, persistence, Git, preview, or
native platform access.

```bash
bun --cwd packages/frontend/ide-ui check-types
bun --cwd packages/frontend/ide-ui lint
```

Export every public component from `src/index.ts`.
