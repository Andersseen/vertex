---
title: Getting started
description: Run the Vertex surface that matches what you want to work on.
---

Vertex is a Bun workspace. Install dependencies once from the repository root:

```bash
git clone https://github.com/Andersseen/vertex.git
cd vertex
bun install
```

## Run the browser workbench

```bash
bun web:dev
```

Open `http://localhost:5173`.

## Run the installed app

The Tauri app also requires a Rust toolchain:

```bash
bun desktop:dev
```

## Work on the embeddable editor

```bash
bun web-editor:build
bun web-editor-demo:start
```

## Run these docs

The docs use Starlight and exercise the built editor bundle:

```bash
bun docs:dev
```

## Before opening a pull request

```bash
bun lint
bun check-types
bun test
bun run build
```

The package-boundary check is also part of lint/type quality in CI:

```bash
bun run check:boundaries
```
