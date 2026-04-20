import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'editor',
    loadComponent: () =>
      import('./editor/editor.component').then((m) => m.EditorComponent),
  },
];
