import { Component, input, output, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { createSidebar } from '@andersseen/headless-components';
import type { SidebarItemDef } from '@andersseen/headless-components';

export interface IdeSidebarItem extends SidebarItemDef {
  badge?: string | number;
  shortcut?: string;
}

@Component({
  selector: 'v-ide-sidebar',
  standalone: true,
  template: `
    <nav
      class="ide-sidebar"
      [class.ide-sidebar--collapsed]="sidebar.queries.isCollapsed()"
      [attr.role]="sidebar.getContainerProps().role"
      [attr.aria-label]="sidebar.getContainerProps()['aria-label']"
      [attr.data-collapsed]="sidebar.getContainerProps()['data-collapsed']"
      [attr.data-state-version]="stateVersion()"
    >
      <div
        class="ide-sidebar__section ide-sidebar__section--main"
        [attr.role]="sidebar.getNavListProps('main').role"
        [attr.aria-label]="sidebar.getNavListProps('main')['aria-label']"
      >
        @for (item of mainItems(); track item.id) {
          <button
            class="ide-sidebar__item"
            [class.ide-sidebar__item--active]="sidebar.queries.isActive(item.id)"
            [class.ide-sidebar__item--disabled]="item.disabled"
            [attr.id]="sidebar.getItemProps(item.id).id"
            [attr.role]="sidebar.getItemProps(item.id).role"
            [attr.aria-current]="sidebar.getItemProps(item.id)['aria-current'] || null"
            [attr.aria-disabled]="sidebar.getItemProps(item.id)['aria-disabled'] || null"
            [attr.data-state]="sidebar.getItemProps(item.id)['data-state']"
            [attr.tabindex]="sidebar.getItemProps(item.id).tabindex"
            type="button"
            (click)="onItemClick(item)"
            (keydown)="onItemKeydown($event, item)"
          >
            <span class="ide-sidebar__item-icon" aria-hidden="true">{{ item.icon || item.label.slice(0, 1) }}</span>
            <span class="ide-sidebar__item-label">{{ item.label }}</span>
            @if (item.badge !== undefined && !sidebar.queries.isCollapsed()) {
              <span class="ide-sidebar__badge">{{ item.badge }}</span>
            }
            @if (item.shortcut && !sidebar.queries.isCollapsed()) {
              <span class="ide-sidebar__shortcut">{{ item.shortcut }}</span>
            }
          </button>
        }
      </div>

      <div
        class="ide-sidebar__section ide-sidebar__section--bottom"
        [attr.role]="sidebar.getNavListProps('bottom').role"
        [attr.aria-label]="sidebar.getNavListProps('bottom')['aria-label']"
      >
        @for (item of bottomItems(); track item.id) {
          <button
            class="ide-sidebar__item"
            [class.ide-sidebar__item--active]="sidebar.queries.isActive(item.id)"
            [class.ide-sidebar__item--disabled]="item.disabled"
            [attr.id]="sidebar.getItemProps(item.id).id"
            [attr.role]="sidebar.getItemProps(item.id).role"
            [attr.aria-current]="sidebar.getItemProps(item.id)['aria-current'] || null"
            [attr.aria-disabled]="sidebar.getItemProps(item.id)['aria-disabled'] || null"
            [attr.data-state]="sidebar.getItemProps(item.id)['data-state']"
            [attr.tabindex]="sidebar.getItemProps(item.id).tabindex"
            type="button"
            (click)="onItemClick(item)"
            (keydown)="onItemKeydown($event, item)"
          >
            <span class="ide-sidebar__item-icon" aria-hidden="true">{{ item.icon || item.label.slice(0, 1) }}</span>
            <span class="ide-sidebar__item-label">{{ item.label }}</span>
            @if (item.badge !== undefined && !sidebar.queries.isCollapsed()) {
              <span class="ide-sidebar__badge">{{ item.badge }}</span>
            }
          </button>
        }
      </div>

      @if (collapsible()) {
        <button
          class="ide-sidebar__toggle"
          [attr.role]="sidebar.getToggleProps().role"
          [attr.aria-expanded]="sidebar.getToggleProps()['aria-expanded']"
          [attr.aria-label]="sidebar.getToggleProps()['aria-label']"
          [attr.tabindex]="sidebar.getToggleProps().tabindex"
          type="button"
          (click)="toggleCollapsed()"
        >
          <span aria-hidden="true">{{ sidebar.queries.isCollapsed() ? '>' : '<' }}</span>
        </button>
      }
    </nav>
  `,
  styleUrl: './ide-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeSidebarComponent {
  readonly items = input<IdeSidebarItem[]>([]);
  readonly defaultActiveItem = input<string>('');
  readonly defaultCollapsed = input<boolean>(false);
  readonly collapsible = input<boolean>(true);
  readonly ariaLabel = input<string>('IDE sidebar');

  readonly activeItemChange = output<string>();
  readonly collapsedChange = output<boolean>();

  protected readonly stateVersion = signal(0);

  protected readonly sidebar = createSidebar({
    items: this.items(),
    defaultActiveItem: this.defaultActiveItem(),
    defaultCollapsed: this.defaultCollapsed(),
    ariaLabel: this.ariaLabel(),
    onActiveItemChange: (id: string) => {
      this.stateVersion.update((v) => v + 1);
      this.activeItemChange.emit(id as string);
    },
    onCollapsedChange: (collapsed: boolean) => {
      this.stateVersion.update((v) => v + 1);
      this.collapsedChange.emit(Boolean(collapsed));
    },
  });

  protected readonly mainItems = () => this.items().filter((item) => item.section !== 'bottom');
  protected readonly bottomItems = () => this.items().filter((item) => item.section === 'bottom');

  constructor() {
    effect(() => {
      this.sidebar.actions.setItems(this.items());
      const active = this.defaultActiveItem() || this.items()[0]?.id;
      if (active) this.sidebar.actions.setActiveItem(active);
      this.sidebar.actions.setCollapsed(this.defaultCollapsed());
      this.stateVersion.update((v) => v + 1);
    });
  }

  protected onItemClick(item: IdeSidebarItem): void {
    if (item.disabled) return;
    this.sidebar.actions.setActiveItem(item.id);
  }

  protected onItemKeydown(event: KeyboardEvent, item: IdeSidebarItem): void {
    this.sidebar.handleItemKeyDown(event, item.id);
    this.stateVersion.update((v) => v + 1);
  }

  protected toggleCollapsed(): void {
    this.sidebar.actions.toggleCollapse();
  }
}
