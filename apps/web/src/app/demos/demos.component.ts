import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
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
  IdeAccordionComponent,
  IdeAccordionItemComponent,
  IdeDropdownComponent,
  IdeContextMenuComponent,
  IdeToasterComponent,
  IdeToastService,
  IdeBreadcrumbComponent,
  IdeTooltipComponent,
  IdeDrawerComponent,
} from '@vertex/ide-ui';
import type {
  IdeTabDef,
  IdeDropdownItemDef,
  IdeContextMenuItemDef,
  IdeBreadcrumbItem,
} from '@vertex/ide-ui';
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
        {
          id: 'app-ts',
          name: 'app.ts',
          path: '/src/app.ts',
          content: '',
          language: 'typescript',
          isDirty: false,
        },
        {
          id: 'app-scss',
          name: 'app.scss',
          path: '/src/app.scss',
          content: '',
          language: 'scss',
          isDirty: false,
        },
        {
          id: 'config',
          name: 'config.json',
          path: '/src/config.json',
          content: '',
          language: 'json',
          isDirty: false,
        },
      ],
    },
    {
      id: 'dist',
      name: 'dist',
      path: '/dist',
      isExpanded: false,
      children: [],
    },
    {
      id: 'readme',
      name: 'README.md',
      path: '/README.md',
      content: '',
      language: 'md',
      isDirty: false,
    },
    {
      id: 'pkg',
      name: 'package.json',
      path: '/package.json',
      content: '',
      language: 'json',
      isDirty: false,
    },
  ],
};

const DEMO_TABS: IdeTabDef[] = [
  { id: 'tab-overview', label: 'Overview' },
  { id: 'tab-config', label: 'Configuration' },
  { id: 'tab-output', label: 'Output' },
  { id: 'tab-disabled', label: 'Disabled', disabled: true },
];

const DEMO_DROPDOWN_ITEMS: IdeDropdownItemDef[] = [
  { id: 'new-file', label: 'New File' },
  { id: 'new-folder', label: 'New Folder' },
  { id: 'sep1', label: '', separator: true },
  { id: 'rename', label: 'Rename' },
  { id: 'delete', label: 'Delete', disabled: true },
];

const DEMO_CONTEXT_ITEMS: IdeContextMenuItemDef[] = [
  { id: 'open', label: 'Open in Editor' },
  { id: 'copy-path', label: 'Copy Path' },
  { id: 'sep1', label: '', separator: true },
  { id: 'reveal', label: 'Reveal in Explorer' },
  { id: 'delete', label: 'Delete' },
];

const DEMO_BREADCRUMB: IdeBreadcrumbItem[] = [
  { id: 'root', label: 'my-project', href: '#' },
  { id: 'src', label: 'src', href: '#' },
  { id: 'app', label: 'app.ts', current: true },
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
    IdeAccordionComponent,
    IdeAccordionItemComponent,
    IdeDropdownComponent,
    IdeContextMenuComponent,
    IdeToasterComponent,
    IdeBreadcrumbComponent,
    IdeTooltipComponent,
    IdeDrawerComponent,
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
  protected readonly dropdownItems = DEMO_DROPDOWN_ITEMS;
  protected readonly contextItems = DEMO_CONTEXT_ITEMS;
  protected readonly breadcrumbItems = DEMO_BREADCRUMB;
  protected readonly selectedDropdown = signal('');
  protected readonly contextItem = signal('');
  protected readonly drawerOpen = signal(false);

  private readonly toast = inject(IdeToastService);

  protected onTabChange(id: string) {
    this.activeTab.set(id);
  }

  protected onFolderToggle(folder: { id: string; isExpanded: boolean }) {
    folder.isExpanded = !folder.isExpanded;
    this.expandedFolders.update((set) => {
      const next = new Set(set);
      if (folder.isExpanded) {
        next.add(folder.id);
      } else {
        next.delete(folder.id);
      }
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

  protected onDropdownSelect(id: string) {
    this.selectedDropdown.set(id);
  }

  protected onContextSelect(id: string) {
    this.contextItem.set(id);
  }

  protected showToast(type: 'default' | 'success' | 'error' | 'warning' | 'info') {
    const messages: Record<string, string> = {
      default: 'Operation completed.',
      success: 'Repository cloned successfully.',
      error: 'Failed to connect to the server.',
      warning: 'File has unsaved changes.',
      info: 'Building project...',
    };
    this.toast.present(messages[type], type);
  }

  protected onBreadcrumbNavigate(item: IdeBreadcrumbItem) {
    // navigation is handled by the parent in real usage
    void item;
  }
}
