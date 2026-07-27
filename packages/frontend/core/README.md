# @vertex/core

Angular application services and platform-facing contracts shared by Vertex
workbenches.

Primary responsibilities:

- workspace, preference, and configuration services;
- Dexie persistence;
- filesystem/Tauri integration services;
- terminal dependency-injection tokens and adapters.

This package does not own CodeMirror configuration or browser runtime
implementations. Put those in `@vertex/editor-core` and `@vertex/runtime`
respectively.

```bash
bun --cwd packages/frontend/core check-types
bun --cwd packages/frontend/core test
```
