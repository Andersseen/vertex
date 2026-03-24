# Vertex IDE

Un IDE ligero construido con Tauri, Angular, CodeMirror y Bun.

## Arquitectura

- **Frontend**: Angular + CodeMirror
- **Backend**: Bun + Hono (sidecar)
- **Desktop**: Tauri (Rust)
- **Monorepo**: Turborepo
- **Package Manager**: Bun

## Estructura del Proyecto

```
vertex/
├── apps/
│   ├── web/              # Angular web app
│   └── desktop/          # Tauri desktop app
├── packages/
│   ├── frontend/         # Shared frontend libs
│   │   ├── types/        # TypeScript types
│   │   ├── core/         # Core services
│   │   └── ui/           # UI components
│   └── backend/
│       └── sidecar/      # Bun + Hono API
└── turbo.json            # Configuración de Turborepo
```

## Scripts disponibles

### Desarrollo

```bash
# Web frontend (Angular) - puerto 4200
bun web:dev

# Desktop app (Tauri + Angular)
bun desktop:dev

# Backend API (Sidecar) - puerto 3001
bun sidecar:dev

# Todo junto (Backend + Web)
bun dev:all

# Todo junto (Backend + Desktop)
bun dev:desktop
```

### Testing

```bash
# Unit tests
bun test

# E2E tests (solo web)
bun test:e2e

# E2E con UI
bun test:e2e:ui
```

### Build

```bash
# Web
bun web:build

# Desktop
bun desktop:build

# Backend
bun sidecar:build

# Todo el proyecto
bun build
```

## Arquitectura de Sidecar

El sidecar es un servidor API ligero que corre en Bun + Hono:

- Puerto: 3001 (configurable via PORT)
- Endpoints:
  - `GET /` - Información del servicio
  - `GET /health` - Health check

## Desarrollo

1. Instalar dependencias: `bun install`
2. Iniciar frontend: `bun web:dev`
3. Iniciar backend: `bun sidecar:dev`
4. Iniciar app completa: `bun desktop:dev`

## Testing Strategy

### Unit Tests

- Vitest para packages
- Angular CLI testing para apps

### E2E Tests

- Playwright para web app
- Tests corren solo en web (misma UI que desktop)
- Multi-browser: Chromium, Firefox, Safari

## Por qué esta arquitectura?

- **Apps separadas**: Web independiente vs Desktop con APIs nativas
- **Packages compartidos**: Sin duplicación de código
- **Testing eficiente**: E2E solo en web, misma UI en desktop
- **Tauri vs Electron**: Más ligero, mejor rendimiento
- **CodeMirror vs Monaco**: Más modular, mejor para personalización
- **Bun vs Node**: Más rápido, bundler integrado
- **Angular**: Ecosistema maduro, TypeScript first
- **Hono**: Framework web minimalista y rápido para Bun
