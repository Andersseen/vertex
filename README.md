# Vertex IDE 🌌

**Vertex** is not just another code editor; it is a "point of convergence" designed for speed, modularity, and precision. Built with the most cutting-edge technologies of the modern web ecosystem: **Angular 21**, **Bun**, **Tauri**, and **CodeMirror 6**.

---

## ⚡ The Vertex Philosophy

### Why does Vertex exist?
Most modern editors have fallen into the "software obesity" trap. They have become heavy platforms trying to solve every problem at once. Vertex is born with a different premise: **an IDE should be a surgical tool, not an operating system.**

Vertex (from Latin *vĕrtex*: summit, point of union) is the intersection between native performance and web flexibility.

### Why is it not "another VSCode clone"?
VSCode is an incredible tool, but its architecture is deeply tied to a monolithic model based on Electron and the Monaco editor. Vertex breaks away from this to offer:
- **True Lightweight Performance**: Thanks to **Tauri (Rust)**, Vertex consumes a fraction of the memory used by Electron-based editors.
- **Total Control**: We don't inherit VSCode's design decisions. Every pixel and every interaction is designed for a "Zen" experience.

---

## 🛠️ Technical Decisions: The "Why"

### CodeMirror 6 vs. Monaco
This is the most critical technical decision in Vertex. While Monaco is the engine behind VSCode (powerful but rigid and heavy), we chose **CodeMirror 6** for its:
- **Extreme Modularity**: CM6 is designed as a system of functional extensions. We can build exactly what we need without the overhead of a full desktop editor inside a tab.
- **Accessibility & Mobile-Friendly**: CM6 behaves natively in the DOM, allowing for a much more fluid integration with **Angular** templates.
- **Modernity**: Its functional state management and handling of large documents make it ideal for the "Push-Pull" reactivity architecture we are implementing.

### Angular 21 + Signals
We use the latest version of Angular to leverage the new **Signals** model. This allows for granular reactivity: only what actually changes is updated, eliminating unnecessary change detection cycles and ensuring constant 60fps in the UI.

### The Sidecar (Bun + Hono)
Instead of a heavy Node.js process, we use a specialized **Sidecar** compiled with **Bun**. This provides an ultra-fast local API for file system operations and heavy processing, keeping the frontend lightweight and responsive.

---

## 📂 Monorepo Structure

```
vertex/
├── apps/
│   ├── web/              # Web Application (Cloudflare Pages ready)
│   └── desktop/          # Desktop Application (Tauri + Rust)
├── packages/
│   ├── frontend/         # Shared libraries
│   │   ├── types/        # Unified type contracts
│   │   ├── core/         # Reactivity engine and base services
│   │   └── ui/           # SCSS design system and components
│   └── backend/
│       └── sidecar/      # Minimalist Bun + Hono backend
```

---

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh) (v1.1+)
- Rust (for the desktop build)

### Main Commands

```bash
# Installation
bun install

# Web Development (Angular) - http://localhost:4200
bun web:dev

# Desktop Development (Tauri)
bun desktop:dev

# Run Everything (Frontend + Sidecar)
bun dev:all
```

---

## 🧪 Quality Strategy

- **Unit Testing**: Vitest for business logic and Angular CLI for components.
- **E2E Testing**: Playwright to ensure the user flow is perfect in Chrome, Firefox, and Safari.
- **CI/CD**: Automated pipeline that validates types, lint, and tests on every push.

---

*Vertex is an evolving project. We seek perfection in simplicity.* 🚀
