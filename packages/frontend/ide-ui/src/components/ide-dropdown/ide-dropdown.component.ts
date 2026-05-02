import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  ElementRef,
  ViewContainerRef,
  DestroyRef,
  TemplateRef,
  viewChild,
  ChangeDetectionStrategy,
  OnDestroy,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OverlayService, OverlayRef } from 'quartz-headless';
import type { OverlayPlacement } from 'quartz-headless';
import { createDropdown } from '@andersseen/headless-components/dropdown';
import { createMenuList } from '@andersseen/headless-components/menu-list';
import {
  focusFirstMenuItem,
  getInteractiveMenuItemIds,
  getInteractiveMenuItems,
  getMenuIndex,
  toHeadlessMenuItem,
} from '../shared/ide-menu.utils';

export interface IdeDropdownItemDef {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  intent?: 'default' | 'destructive';
  disabled?: boolean;
  separator?: boolean;
}

export type IdeDropdownPlacement = OverlayPlacement;

@Component({
  selector: 'v-ide-dropdown',
  standalone: true,
  template: `
    <div class="ide-dropdown" #triggerEl>
      <div
        class="ide-dropdown__trigger"
        [attr.aria-haspopup]="dropdown.getTriggerProps()['aria-haspopup']"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-disabled]="dropdown.getTriggerProps()['aria-disabled'] || null"
        [attr.data-state]="isOpen() ? 'open' : 'closed'"
        (click)="toggle()"
        (keydown)="onTriggerKeyDown($event)"
      >
        <ng-content select="[dropdownTrigger]" />
      </div>

      <ng-template #menuTemplate>
        <div
          class="ide-dropdown__menu"
          [attr.id]="menuId"
          [attr.role]="menu.getMenuProps().role"
          [attr.aria-label]="menu.getMenuProps()['aria-label']"
          [attr.data-state]="isOpen() ? 'open' : 'closed'"
          (keydown)="onMenuKeyDown($event)"
        >
          @for (item of items(); track item.id; let idx = $index) {
            @if (item.separator) {
              <div class="ide-dropdown__separator" role="separator"></div>
            } @else {
              <button
                class="ide-dropdown__item"
                [class.ide-dropdown__item--disabled]="item.disabled"
                [class.ide-dropdown__item--destructive]="item.intent === 'destructive'"
                [attr.role]="menu.getItemProps(toMenuItem(item), menuIndex(idx)).role"
                [attr.tabindex]="menu.getItemProps(toMenuItem(item), menuIndex(idx)).tabindex"
                [attr.aria-disabled]="menu.getItemProps(toMenuItem(item), menuIndex(idx))['aria-disabled'] || null"
                [attr.data-disabled]="item.disabled || null"
                [attr.data-state]="menu.getItemProps(toMenuItem(item), menuIndex(idx))['data-state']"
                [attr.data-ide-menu-item]="item.id"
                (click)="onItemClick(item)"
              >
                @if (item.icon) {
                  <span class="ide-dropdown__item-icon">{{ item.icon }}</span>
                }
                <span class="ide-dropdown__item-label">{{ item.label }}</span>
                @if (item.shortcut) {
                  <span class="ide-dropdown__shortcut">{{ item.shortcut }}</span>
                }
              </button>
            }
          }
        </div>
      </ng-template>
    </div>
  `,
  styleUrl: './ide-dropdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeDropdownComponent implements OnDestroy {
  readonly items = input<IdeDropdownItemDef[]>([]);
  readonly placement = input<IdeDropdownPlacement>('bottom-start');
  readonly matchTriggerWidth = input<boolean>(false);
  readonly menuLabel = input<string>('Dropdown menu');
  readonly itemSelected = output<string>();

  private static idCounter = 0;

  protected readonly menuId = `ide-dropdown-menu-${++IdeDropdownComponent.idCounter}`;
  protected readonly isOpen = signal(false);
  protected readonly itemIds = computed(() => getInteractiveMenuItemIds(this.items()));

  protected readonly dropdown = createDropdown({
    placement: 'bottom',
    onOpenChange: (open) => this.syncOpen(Boolean(open)),
  });

  protected readonly menu = createMenuList({
    ariaLabel: this.menuLabel(),
    items: [],
    onSelect: (id) => this.selectById(id),
  });

  private readonly triggerRef = viewChild.required<ElementRef<HTMLElement>>('triggerEl');
  private readonly menuTemplate = viewChild.required<TemplateRef<unknown>>('menuTemplate');
  private readonly overlayService = inject(OverlayService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private overlayRef: OverlayRef | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.ngOnDestroy());
  }

  ngOnDestroy(): void {
    this.overlayRef?.destroy();
    this.overlayRef = null;
  }

  open(): void {
    if (this.isOpen()) return;
    this.ensureOverlay();
    this.menu.actions.setItems(this.menuItems());
    this.dropdown.actions.open();
    this.overlayRef?.open();
    this.syncOpen(true);
    this.focusFirstItem();
  }

  close(): void {
    if (!this.isOpen()) return;
    this.dropdown.actions.close();
    this.overlayRef?.close();
    this.syncOpen(false);
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  protected onTriggerKeyDown(event: KeyboardEvent): void {
    this.dropdown.handleTriggerKeyDown(event);
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      this.open();
    }
  }

  protected onMenuKeyDown(event: KeyboardEvent): void {
    this.menu.handleMenuKeyDown(event);
    this.dropdown.handleMenuKeyDown(event, this.itemIds());
    if (event.key === 'Escape' || event.key === 'Tab') this.close();
  }

  protected onItemClick(item: IdeDropdownItemDef): void {
    if (item.disabled) return;
    this.menu.actions.selectItem(item.id);
  }

  protected toMenuItem(item: IdeDropdownItemDef) {
    return toHeadlessMenuItem(item);
  }

  protected menuIndex(templateIndex: number): number {
    return getMenuIndex(this.items(), templateIndex);
  }

  private ensureOverlay(): void {
    if (this.overlayRef) return;
    this.overlayRef = this.overlayService.create(
      this.menuTemplate(),
      this.viewContainerRef,
      this.triggerRef().nativeElement,
      {
        placement: this.placement(),
        offset: 4,
        closeOnClickOutside: true,
        closeOnEscape: true,
        closeOnScroll: true,
        matchAnchorWidth: this.matchTriggerWidth(),
      },
    );
    this.overlayRef.closed$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.syncOpen(false));
  }

  private syncOpen(open: boolean): void {
    this.isOpen.set(open);
  }

  private menuItems() {
    return getInteractiveMenuItems(this.items());
  }

  private selectById(id: string): void {
    const item = this.items().find((candidate) => candidate.id === id);
    if (!item || item.disabled || item.separator) return;
    this.dropdown.actions.selectItem(id);
    this.close();
    this.itemSelected.emit(id);
  }

  private focusFirstItem(): void {
    focusFirstMenuItem(this.document, this.menuId);
  }
}
