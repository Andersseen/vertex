# @vertex/backend-core

Experimental shared terminal manager, router, and backend contracts.

This workspace is not yet the authoritative backend abstraction. Do not build
new product features on it until the platform-adapter contract is selected and
wired into the applications.

Current safe uses are isolated type work, tests, and migration experiments.
Avoid duplicating behavior that already exists in `@vertex/core` terminal
adapters or the terminal sidecar.
