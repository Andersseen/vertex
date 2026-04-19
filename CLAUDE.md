# Vertex IDE — Claude Context

## Proyecto

Monorepo Turbo + Bun (`bun@1.3.11`). IDE web/desktop para desarrolladores, con filesystem virtual en el browser (OPFS + IndexedDB) y git browser-native.

```
apps/
  web/          → Angular 21 app principal (ng serve → localhost:4200)
  desktop/      → Tauri + Rust
packages/
  frontend/
    ide-ui/     → @vertex/ide-ui — componentes IDE (headless + CSS custom props)
    ui/         → @vertex/ui — layouts, editor CodeMirror, sidebar
    runtime/    → @vertex/runtime — VirtualFS + GitClient (browser)
    core/       → @vertex/core — servicios Angular (RuntimeService, PreferencesService, Dexie DB)
    types/      → @vertex/types — tipos compartidos
    web-editor/ → @vertex/web-editor — Angular Element standalone (web component)
  backend/
    terminal/   → @vertex/terminal-sidecar — Node.js + node-pty
    sidecar/    → Rust sidecar para Tauri
```

**Comandos útiles:**
- `bun web:dev` — servidor de desarrollo web
- `bun build` — build completo vía Turbo
- `bun --cwd packages/frontend/<pkg> check-types` — typecheck de un paquete

---

## Stack técnico

**Frontend:**
- Angular 21, **zoneless** (`provideZonelessChangeDetection()`), signals
- CodeMirror 6 (editor), xterm.js (terminal)
- `@andersseen/headless-components` — headless logic para ide-ui
- Quartz UI (`/Users/andriipap/Andersseen/Web/Projects/quartz/`) — directivas headless Angular propias, estilo shadcn (no npm, se copia en `src/primitives/`). Módulos: splitter, dialog, drag-drop, overlay, toast, tooltip, listbox
- CSS custom properties para todo el theming (`--ide-*` tokens en ide-ui)
- Sin Tailwind, sin PrimeNG (eliminado)

**Backend:**
- Node.js + node-pty para terminal
- Rust sidecar (Tauri)

**Persistencia:**
- `localStorage` → posiciones splitter (sync, sin flash)
- `sessionStorage` → tabs abiertos (`vertex:editor`) — intencionalmente volátil
- Dexie v4 (`vertex-ide` DB) → sesión activa, preferencias estructuradas
- OPFS + IndexedDB (Lightning FS) → archivos del repo clonado

---

## Principios de código — siempre

### SOLID
- **S** — cada clase/componente hace una sola cosa. Si un componente crece, dividirlo.
- **O** — extender via inputs/outputs/composition, no modificar componentes existentes.
- **L** — los servicios son intercambiables via tokens DI de Angular (`InjectionToken`).
- **I** — interfaces pequeñas y específicas. No una interfaz "god object".
- **D** — depender de abstracciones (`IVirtualFS`, `IGitClient`), no de implementaciones concretas.

### KISS
- La solución más simple que funciona. Sin abstracciones prematuras.
- Si se puede resolver con 10 líneas, no crear una clase nueva.
- No añadir parámetros, opciones ni flags para casos hipotéticos.

### DRY
- Extraer solo cuando hay 3+ repeticiones reales, no anticipadas.
- Lógica de dominio en servicios, lógica de UI en componentes.
- Usar `computed()` de Angular signals para derivar estado, no duplicarlo.

---

## Angular moderno — patrones preferidos

```typescript
// ✅ Signals-first
readonly count = signal(0);
readonly doubled = computed(() => this.count() * 2);

// ✅ input() / output() — no @Input/@Output
readonly value = input<string>('');
readonly valueChange = output<string>();

// ✅ inject() — no constructor DI
private readonly service = inject(MyService);

// ✅ OnPush siempre
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })

// ✅ Standalone — no NgModules
@Component({ standalone: true, imports: [...] })

// ✅ Nuevos bloques de control
@if (condition) { ... }
@for (item of items; track item.id) { ... }

// ❌ No usar: ngModel, NgZone, EventEmitter, BehaviorSubject para estado local
```

**Componentes pequeños > un componente grande.** Si el template supera ~80 líneas o la clase ~100, es señal de dividir.

---

## ide-ui — reglas específicas

- Todos los estilos via CSS custom properties (`var(--ide-*)`), nunca valores hardcoded.
- Siempre `ChangeDetectionStrategy.OnPush`.
- Para lógica interactiva compleja (modal, tabs, splitter): usar primitivo de `@andersseen/headless-components` o Quartz.
- Para añadir un componente nuevo de Quartz: copiar los archivos del módulo de `/Users/andriipap/Andersseen/Web/Projects/quartz/packages/quartz/src/lib/<module>/` a `packages/frontend/ide-ui/src/primitives/<module>/`.
- Exportar todo desde `packages/frontend/ide-ui/src/index.ts`.

---

## Fase 1 — estado actual (completada)

Lo que está hecho y funciona:
- ✅ VirtualFS (OPFS) + GitClient (isomorphic-git) en el browser
- ✅ Clone de repos públicos/privados con progreso
- ✅ Persistencia de sesión via Dexie (DB `vertex-ide`, tabla `sessions`)
- ✅ Restauración de tabs abiertos tras refresh (sessionStorage)
- ✅ Layout IDE: toolbar + splitter horizontal (sidebar/editor) + splitter vertical (editor/bottom)
- ✅ Splitter con persistencia de posición (localStorage, sin flash)
- ✅ ide-ui: button, tabs, layout, dialog, input, progress-bar, alert, tree, toolbar, splitter
- ✅ ide-splitter basado en quartz (ya copiado en `primitives/splitter/`)
- ✅ Terminal virtual (xterm.js + VirtualTerminalService)
- ✅ Sin PrimeNG (eliminado completamente)
- ✅ Dexie v4 en @vertex/core (db, PreferencesService)
- ✅ writeFile con error handling, restoreEditorState awaited correctamente

Pendiente antes de Fase 2:
- ⏳ ng-packagr setup para ide-ui (buildable/publishable como `vertex-ui` en npm)
- ⏳ CDK virtual scroll en ide-tree (repos grandes)

---

## Fase 2 — contexto y plan (no empezada)

**Objetivo:** Convertir Vertex en un IDE que no solo lee código sino que puede ejecutarlo en el browser.

### Runtime pipeline
```
Fase 2A — Build (esbuild-wasm)
  Compilar TypeScript/JavaScript en el browser con esbuild-wasm
  Output: bundle JS en memoria / OPFS

Fase 2B — Preview (Service Worker + iframe)
  Service Worker intercepta fetch para servir archivos desde OPFS
  iframe aislado para preview en vivo
  Hot reload via postMessage

Fase 2C — Node.js Runtime (Nodebox / WebContainers API)
  Ejecutar código Node.js en el browser (WebContainers de StackBlitz o Nodebox de Sandpack)
  npm install en browser

Fase 2D — Deploy (Cloudflare Pages API)
  Deploy directo desde el IDE al usuario autenticado
```

### Dependencias de Fase 2
- `esbuild-wasm` — build en browser
- Service Worker registration en `apps/web`
- Decision: WebContainers (StackBlitz, requiere COOP/COEP headers) vs Nodebox (más permisivo)
- Cloudflare Pages API token en settings de usuario (Dexie `preferences`)

### Lo que ya está preparado para Fase 2
- `@vertex/runtime` tiene arquitectura de fases documentada (Phase 2-6 en roadmap)
- `PreferencesService` (Dexie) listo para guardar tokens de deploy, settings
- `VertexDatabase` extensible: añadir tablas con `db.version(2).stores({...})`
- `IVirtualFS` / `IGitClient` interfaces — Fase 2 puede añadir `IBuildRunner`, `IPreviewServer`
- Terminal virtual ya integrada — se puede reconectar a WebContainers shell

### Arquitectura sugerida para Fase 2
```
@vertex/runtime (ampliar, no reescribir)
  src/
    fs/       ✅ ya existe
    git/      ✅ ya existe
    build/    🆕 BuildRunner (esbuild-wasm)
    preview/  🆕 PreviewServer (SW + iframe bridge)
    node/     🆕 NodeRuntime (WebContainers/Nodebox adapter)
    deploy/   🆕 DeployService (Cloudflare Pages)
```
