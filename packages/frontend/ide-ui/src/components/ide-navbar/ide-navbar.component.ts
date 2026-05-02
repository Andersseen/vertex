import { Component, input, output, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { createNavbar } from '@andersseen/headless-components';
import type { NavbarItem } from '@andersseen/headless-components';

export interface IdeNavbarItem extends NavbarItem {
  shortcut?: string;
}

@Component({
  selector: 'v-ide-navbar',
  standalone: true,
  template: `
    <nav
      class="ide-navbar"
      [attr.role]="navbar.getContainerProps().role"
      [attr.aria-label]="navbar.getContainerProps()['aria-label']"
      [attr.data-state-version]="stateVersion()"
    >
      <div class="ide-navbar__start">
        <ng-content select="[navStart]" />
      </div>
      <div class="ide-navbar__center">
        @if (items().length > 0) {
          <div
            class="ide-navbar__list"
            [attr.role]="navbar.getNavListProps().role"
            [attr.aria-label]="navbar.getNavListProps()['aria-label']"
          >
            @for (item of items(); track item.id) {
              <a
                class="ide-navbar__item"
                [class.ide-navbar__item--active]="navbar.queries.isActive(item.id)"
                [class.ide-navbar__item--disabled]="item.disabled"
                [attr.id]="navbar.getItemProps(item.id, item).id"
                [attr.role]="navbar.getItemProps(item.id, item).role"
                [attr.href]="item.disabled ? null : item.href || null"
                [attr.target]="item.target || null"
                [attr.aria-current]="navbar.getItemProps(item.id, item)['aria-current'] || null"
                [attr.aria-disabled]="navbar.getItemProps(item.id, item)['aria-disabled'] || null"
                [attr.data-state]="navbar.getItemProps(item.id, item)['data-state']"
                [attr.tabindex]="navbar.getItemProps(item.id, item).tabindex"
                (click)="onItemClick($event, item)"
                (keydown)="onItemKeydown($event, item)"
              >
                @if (item.icon) {
                  <span class="ide-navbar__item-icon">{{ item.icon }}</span>
                }
                <span class="ide-navbar__item-label">{{ item.label }}</span>
                @if (item.shortcut) {
                  <span class="ide-navbar__shortcut">{{ item.shortcut }}</span>
                }
              </a>
            }
          </div>
        } @else {
          <ng-content select="[navCenter]" />
        }
      </div>
      <div class="ide-navbar__end">
        <ng-content select="[navEnd]" />
      </div>
    </nav>
  `,
  styleUrl: './ide-navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeNavbarComponent {
  readonly items = input<IdeNavbarItem[]>([]);
  readonly defaultActiveItem = input<string>('');
  readonly ariaLabel = input<string>('IDE navigation');
  readonly activeItemChange = output<string>();

  protected readonly stateVersion = signal(0);

  protected readonly navbar = createNavbar({
    items: this.items(),
    defaultActiveItem: this.defaultActiveItem(),
    ariaLabel: this.ariaLabel(),
    onActiveItemChange: (id: string) => {
      this.stateVersion.update((v) => v + 1);
      this.activeItemChange.emit(id as string);
    },
  });

  constructor() {
    effect(() => {
      this.navbar.actions.setItems(this.items());
      const active = this.defaultActiveItem() || this.items()[0]?.id;
      if (active) this.navbar.actions.setActiveItem(active);
      this.stateVersion.update((v) => v + 1);
    });
  }

  protected onItemClick(event: MouseEvent, item: IdeNavbarItem): void {
    if (item.disabled) {
      event.preventDefault();
      return;
    }
    this.navbar.actions.setActiveItem(item.id);
    if (!item.href) event.preventDefault();
  }

  protected onItemKeydown(event: KeyboardEvent, item: IdeNavbarItem): void {
    this.navbar.handleItemKeyDown(event, item.id);
    this.stateVersion.update((v) => v + 1);
  }
}
