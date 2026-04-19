# Landing Web — Plan de implementación

**Estado:** Planificado — no iniciado  
**Prioridad:** Antes de publicar Vertex al público  
**Referencia:** https://code-studio.chenxiaoyao.cn/

---

## Concepto

La entrada actual (`/`) abre directamente el IDE vacío — no hay contexto, no hay propuesta de valor, no hay razón para quedarse.

**Objetivo:** Añadir una landing page en `/` que vende el producto y lleva al usuario al editor de forma fluida. Sin sitio separado — misma app Angular, mismo deploy en Cloudflare Pages.

---

## Flujo de usuario

```
/ (landing)
  ├── "Clone & Edit" + URL  →  /editor?clone=<url>  →  auto-clone al cargar
  └── "Open Editor"         →  /editor              →  IDE vacío o sesión restaurada

/editor
  ├── ?clone=<url> presente →  abre clone dialog y lanza clone automáticamente
  ├── sesión Dexie activa   →  restaura estado (tabs, árbol)
  └── sin nada              →  empty state con CTA "Clone a repo to get started"
```

---

## Arquitectura técnica

### Cambios en routing

Añadir `provideRouter()` en `apps/web/src/app/app.config.ts`:

```typescript
// app.routes.ts (nuevo)
export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'editor', component: EditorComponent },
];
```

El componente `App` actual pasa a llamarse `EditorComponent` y se mueve a su propia carpeta.

### Auto-clone desde query param

`EditorComponent` lee `ActivatedRoute` en `ngOnInit`:

```typescript
// Si hay ?clone=<url> → abrir dialog y lanzar clone automáticamente
const cloneUrl = this.route.snapshot.queryParamMap.get('clone');
if (cloneUrl) { /* auto-open clone dialog con la URL */ }
```

### Empty state del editor

Cuando no hay sesión ni `?clone`, mostrar dentro del área del editor:
- Mensaje: _"Clone a repo to get started"_
- Input URL + botón "Clone" (mismo componente que el hero de la landing)

---

## Estructura de archivos

```
apps/web/src/app/
  app.routes.ts                         ← nuevo
  landing/
    landing.component.ts                ← orquestador, solo estructura
    components/
      navbar/
        navbar.component.ts
        navbar.component.scss
      hero/
        hero.component.ts               ← input URL + CTA principal
        hero.component.scss
      features/
        features.component.ts
        features.component.scss
      how-it-works/
        how-it-works.component.ts
        how-it-works.component.scss
      footer/
        footer.component.ts
        footer.component.scss
  editor/
    editor.component.ts                 ← App actual renombrada
    (resto de archivos sin cambios)
```

Componente por sección — ninguno supera ~80 líneas de template. El `LandingComponent` solo organiza el layout.

---

## Secciones

### 1. Navbar
- Logo `V · VERTEX IDE` (izquierda)
- Link GitHub del repo (icono) + botón `Open Editor` (derecha)
- Sticky. Transparente sobre el hero, `$surface-900` con border al hacer scroll (IntersectionObserver)

### 2. Hero _(sección más importante)_
- **Headline:** `"Edit any GitHub repo, right in your browser"`
- **Subheadline:** `"Clone, edit, and commit — zero install. Everything runs locally in your browser."`
- **Input + botón:** campo URL de GitHub → botón `"Clone & Edit"` → navega a `/editor?clone=<url>`
- **Hint bajo el input:** `Try: https://github.com/andersseen/palette-forge`
- **Visual:** screenshot real del IDE (imagen estática) como contexto visual a la derecha o debajo del CTA

### 3. Features _(3 tarjetas en grid)_

| Feature | Descripción |
|---------|-------------|
| **Clone any repo** | Public or private GitHub repos. Files clone directly into your browser via isomorphic-git — no server involved. |
| **Persistent storage** | OPFS keeps your files across sessions. Close the tab, come back later, everything is still there. |
| **Full IDE experience** | Tabs, syntax highlighting for 15+ languages, file tree, integrated terminal. The tools you know. |

### 4. How it works _(3 pasos numerados)_
1. Paste a GitHub repo URL
2. Files clone in your browser — no server, no upload
3. Edit, commit, push when you're ready

### 5. Footer _(mínimo)_
- GitHub repo link
- `"Built with Vertex"`
- Sin links innecesarios

---

## Estilos

- **Dark theme** consistente con el IDE — mismos tokens SCSS `$surface-*` de `@vertex/ui`
- Fondo general: `$surface-950` → el IDE "emerge" naturalmente de la página
- Headline con gradiente sutil: `$primary-400` → `$ide-cyan` (tokens existentes)
- Hero: sin imagen de fondo pesada — gradiente radial oscuro centrado en el input
- Grid features: 3 columnas en desktop, 1 en mobile
- Sin librerías externas de UI para la landing — SCSS puro

---

## Orden de implementación

| Paso | Tarea | Tiempo estimado |
|------|-------|----------------|
| 1 | `app.routes.ts` + `provideRouter()` en config | ~15 min |
| 2 | Renombrar `App` → `EditorComponent`, ajustar imports | ~10 min |
| 3 | `NavbarComponent` (más simple, no depende de nada) | ~30 min |
| 4 | `HeroComponent` con input URL funcional | ~45 min |
| 5 | Lógica `?clone=` en `EditorComponent` | ~20 min |
| 6 | `FeaturesComponent` + `HowItWorksComponent` | ~45 min |
| 7 | `FooterComponent` + `LandingComponent` orquestador | ~20 min |
| 8 | Estilos finales, responsive, screenshot del IDE | ~60 min |

**Total estimado:** ~4 horas de implementación limpia.

---

## Preguntas abiertas antes de empezar

- [ ] ¿Screenshot del IDE como imagen estática o mini-embed real del editor?
- [ ] ¿Repo público de demo para el hint del hero input? (actualmente `palette-forge`)
- [ ] ¿Dominio final ya configurado en Cloudflare Pages?
- [ ] ¿Se quiere analytics (Cloudflare Analytics, Plausible)?

---

## Notas para la sesión que lo implemente

- Leer `CLAUDE.md` en la raíz del repo antes de empezar
- El deploy ya está configurado: `bun --cwd apps/web run deploy` → `wrangler pages deploy`
- Los tokens de color están en `packages/frontend/ui/src/styles/theme.scss` y `packages/frontend/ide-ui/src/styles/tokens/`
- El componente `CloneDialogComponent` tiene la lógica de clone lista — reutilizar o extraer el servicio para el hero input
- `RuntimeService` en `@vertex/core/web` es el que hace el clone efectivo
