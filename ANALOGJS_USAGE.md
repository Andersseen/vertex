# AnalogJS Usage Guide (Vertex)

Internal guide for using [AnalogJS](https://analogjs.org/) in `apps/web`.

## Route structure

Routes are file-based. Everything lives in:

```
apps/web/src/app/routes/
```

Each `.page.ts` file exports by default a standalone component that acts as a route.

## File conventions

| Extension | Purpose |
|-----------|-----------|
| `.page.ts` | Page/route component. Default export of the component. |
| `.server.ts` | Server-resolved data (loaders). Optional. |
| `.layout.ts` | Nested layout for child routes. Optional. |

## Minimal page example

```typescript
import { Component } from '@angular/core';
import { RouteMeta } from '@analogjs/router';

export const routeMeta: RouteMeta = {
  title: 'Home',
};

@Component({
  selector: 'v-home',
  template: `<h1>Home</h1>`,
})
export default class HomePageComponent {}
```

## Nested routes

Create a folder with the route name and an `index.page.ts` inside:

```
routes/
  editor.page.ts       # /editor
  editor/
    index.page.ts      # /editor (also)
    settings.page.ts   # /editor/settings
```

## Route metadata

Use `routeMeta` for title, guards, resolvers and static data:

```typescript
export const routeMeta: RouteMeta = {
  title: 'Editor',
  canActivate: [() => inject(AuthGuard).canActivate()],
};
```

## Data loaders (server)

```typescript
// routes/projects.server.ts
import { PageServerLoad } from '@analogjs/router';

export const load = (async () => {
  return { projects: [] };
}) satisfies PageServerLoad;
```

```typescript
// routes/projects.page.ts
import { Component } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { getLoadResolver } from '@analogjs/router';

@Component({ ... })
export default class ProjectsPageComponent {
  readonly data = toSignal(getLoadResolver<typeof import('./projects.server')>());
}
```

## Layouts

A `.layout.ts` file inside a folder applies to all child routes:

```
routes/
  app.layout.ts
  (app)/
    index.page.ts
    editor.page.ts
```

## Best practices

- Keep page components small; delegate to components in `apps/web/src/app/components/`.
- Use `input()` to read route parameters when `withComponentInputBinding()` is configured.
- Do not use `ngModel` or template-driven forms in pages; prefer reactive forms.
- Always export `routeMeta` as `const` when metadata is needed.

## References

- Official docs: https://analogjs.org/
- Project conventions: [`AGENTS.md`](./AGENTS.md)
