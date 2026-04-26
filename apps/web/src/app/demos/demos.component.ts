import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  IdeNavbarComponent,
  IdeButtonComponent,
  IdeInputComponent,
  IdeTabsComponent,
  IdeAlertComponent,
  IdeProgressBarComponent,
  IdeDialogComponent,
  IdeSplitterComponent,
  IdeTreeComponent,
} from '@vertex/ide-ui';
import type { IdeTabDef } from '@vertex/ide-ui';
import type { VertexFolder } from '@vertex/types';

const DEMO_TREE: VertexFolder = {
  id: 'root',
  name: 'my-project',
  path: '/',
  isExpanded: true,
  children: [
    {
      id: 'src',
      name: 'src',
      path: '/src',
      isExpanded: true,
      children: [
        { id: 'app-ts', name: 'app.ts', path: '/src/app.ts', content: '', language: 'typescript', isDirty: false },
        { id: 'app-scss', name: 'app.scss', path: '/src/app.scss', content: '', language: 'scss', isDirty: false },
        { id: 'config', name: 'config.json', path: '/src/config.json', content: '', language: 'json', isDirty: false },
      ],
    },
    {
      id: 'dist',
      name: 'dist',
      path: '/dist',
      isExpanded: false,
      children: [],
    },
    { id: 'readme', name: 'README.md', path: '/README.md', content: '', language: 'md', isDirty: false },
    { id: 'pkg', name: 'package.json', path: '/package.json', content: '', language: 'json', isDirty: false },
  ],
};

const DEMO_TABS: IdeTabDef[] = [
  { id: 'tab-overview', label: 'Overview' },
  { id: 'tab-config', label: 'Configuration' },
  { id: 'tab-output', label: 'Output' },
  { id: 'tab-disabled', label: 'Disabled', disabled: true },
];

@Component({
  selector: 'v-demos',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    IdeNavbarComponent,
    IdeButtonComponent,
    IdeInputComponent,
    IdeTabsComponent,
    IdeAlertComponent,
    IdeProgressBarComponent,
    IdeDialogComponent,
    IdeSplitterComponent,
    IdeTreeComponent,
  ],
  templateUrl: './demos.component.html',
  styleUrl: './demos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemosComponent {
  protected readonly tabs = DEMO_TABS;
  protected readonly activeTab = signal('tab-overview');
  protected readonly inputValue = signal('');
  protected readonly progress = signal(65);
  protected readonly dialogOpen = signal(false);
  protected readonly expandedFolders = signal<Set<string>>(new Set(['root', 'src']));
  protected readonly activeFileId = signal<string | null>(null);
  protected readonly tree = DEMO_TREE;

  protected onTabChange(id: string) {
    this.activeTab.set(id);
  }

  protected onFolderToggle(folder: { id: string; isExpanded: boolean }) {
    folder.isExpanded = !folder.isExpanded;
    this.expandedFolders.update((set) => {
      const next = new Set(set);
      folder.isExpanded ? next.add(folder.id) : next.delete(folder.id);
      return next;
    });
  }

  protected onFileSelect(file: { id: string }) {
    this.activeFileId.set(file.id);
  }

  protected decreaseProgress() {
    this.progress.update((v) => Math.max(0, v - 10));
  }

  protected increaseProgress() {
    this.progress.update((v) => Math.min(100, v + 10));
  }
}
