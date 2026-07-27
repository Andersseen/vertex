# @vertex/terminal-sidecar

Local Node.js terminal sidecar backed by `node-pty`.

It exposes native pseudo-terminal capabilities to an installed or local Vertex
workbench. It is not required by the hosted browser workbench and must not
become a dependency of `<vertex-editor>`.

## Development

```bash
npm install
bun terminal:dev
```

The workbench consumes terminal behavior through the
`TERMINAL_BACKEND_ADAPTER` contract. New UI code should depend on that contract,
not directly on this process.

The terminal adapter migration is still in progress. Remove older duplicate
implementations only after the typed platform adapter is integrated and tested.
