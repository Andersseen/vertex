# Vertex IDE

Un IDE ligero construido con Tauri, Angular, CodeMirror y Bun.

## Arquitectura

- **Frontend**: Angular + CodeMirror
- **Backend**: Bun + Hono (sidecar)
- **Desktop**: Tauri (Rust)
- **Monorepo**: Turborepo
- **Package Manager**: Bun

## Scripts disponibles

### Desarrollo

```bash
# Frontend (Angular) - puerto 4200
bun ui:dev

# Backend (Sidecar API) - puerto 3001
bun sidecar:dev

# App de escritorio completa (Tauri + Angular)
bun tauri:dev

# Todo junto (Backend + App Desktop)
bun dev:all
```

### Build

```bash
# Frontend
bun ui:build

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

## Estructura

```
vertex/
├── apps/
│   └── vertex-ui/          # Frontend Angular + Tauri
├── packages/
│   └── vertex-sidecar/     # Backend API con Bun + Hono
└── turbo.json              # Configuración de Turborepo
```

## Desarrollo

1. Instalar dependencias: `bun install`
2. Iniciar frontend: `bun ui:dev`
3. Iniciar backend: `bun sidecar:dev`
4. Iniciar app completa: `bun app:dev`

## Por qué esta arquitectura?

- **Tauri vs Electron**: Más ligero, mejor rendimiento, menos consumo de RAM
- **CodeMirror vs Monaco**: Más modular, mejor para personalización
- **Bun vs Node**: Más rápido, bundler integrado
- **Angular**: Ecosistema maduro, TypeScript first
- **Hono**: Framework web minimalista y rápido para Bun
