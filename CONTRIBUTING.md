# Contributing to Vertex

Thanks for your interest in contributing.

## Before You Start

- Search existing issues and pull requests before opening a new one.
- For security issues, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
- Keep pull requests focused and small when possible.

## Development Setup

1. Install prerequisites:
   - Bun 1.3.11+
   - Node.js 18+
   - Rust toolchain (desktop/Tauri work)
2. Install dependencies:

```bash
bun install
```

3. Run checks locally before opening a PR:

```bash
bun run lint
bun run check-types
bun test
```

## Branch and PR Workflow

1. Fork the repository and create a topic branch.
2. Make your changes with tests when applicable.
3. Update docs when behavior changes.
4. Open a pull request using the provided template.

## Commit Guidelines

This project prefers Conventional Commit style:

- feat: new functionality
- fix: bug fix
- docs: documentation changes
- refactor: internal code changes without behavior changes
- test: tests added or updated
- chore: maintenance and tooling changes

Examples:

- feat(editor): add multi-cursor support
- fix(web): guard against null route params

## Coding Standards

- Follow existing project patterns and naming conventions.
- Avoid unrelated formatting changes.
- Keep public APIs stable unless the change explicitly targets them.
- Add concise comments only when code is not self-explanatory.

## Testing Expectations

- Add or update tests for behavior changes.
- Ensure lint and type checks pass locally.
- If tests are skipped, explain why in the PR description.

## Documentation Expectations

Update relevant documentation when changing:

- Setup or build behavior
- CLI commands
- Configuration options
- Public APIs

## Review Process

Maintainers may request changes before merge. Please keep discussions constructive and focused on code and behavior.

By participating in this project, you agree to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
