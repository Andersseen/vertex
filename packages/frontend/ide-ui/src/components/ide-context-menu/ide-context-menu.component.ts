import {
  Component,
  input,
  output,
  signal,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
  ElementRef,
  TemplateRef,
  ViewContainerRef,
  viewChild,
  OnDestroy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OverlayService, OverlayRef } from 'quartz-headless';
import { createContextMenu } from '@andersseen/headless-components/context-menu';
import { createMenuList } from '@andersseen/headless-components/menu-list';

export interface IdeContextMenuItemDef {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  intent?: 'default' | 'destructive';
  disabled?: boolean;
  separator?: boolean;
}

@Component({
  selector: 'v-ide-context-menu',
  standalone: true,
  template: `
    <div
      class="ide-context-menu__host"
      (contextmenu)="onContextMenu($event)"
    >
      <ng-content />
    </div>

    <ng-template #menuTemplate>
        <div
          class="ide-context-menu__panel"
          [attr.id]="menuId"
          [attr.role]="menu.getMenuProps().role"
          [attr.aria-label]="menu.getMenuProps()['aria-label']"
          [attr.data-state]="isOpen() ? 'open' : 'closed'"
          (keydown)="onMenuKeyDown($event)"
        >
          @for (item of items(); track item.id; let idx = $index) {
            @if (item.separator) {
              <div class="ide-context-menu__separator" role="separator"></div>
            } @else {
              <button
                class="ide-context-menu__item"
                [class.ide-context-menu__item--disabled]="item.disabled"
                [class.ide-context-menu__item--destructive]="item.intent === 'destructive'"
                [attr.role]="menu.getItemProps(toMenuItem(item), menuIndex(idx)).role"
                [attr.tabindex]="menu.getItemProps(toMenuItem(item), menuIndex(idx)).tabindex"
                [attr.aria-disabled]="menu.getItemProps(toMenuItem(item), menuIndex(idx))['aria-disabled'] || null"
                [attr.data-disabled]="item.disabled || null"
                [attr.data-state]="menu.getItemProps(toMenuItem(item), menuIndex(idx))['data-state']"
                [attr.data-ide-menu-item]="item.id"
                (click)="onItemClick(item)"
              >
                @if (item.icon) {
                  <span class="ide-context-menu__item-icon">{{ item.icon }}</span>
                }
                <span class="ide-context-menu__item-label">{{ item.label }}</span>
                @if (item.shortcut) {
                  <span class="ide-context-menu__shortcut">{{ item.shortcut }}</span>
                }
              </button>
            }
          }
        </div>
    </ng-template>
  `,
  styleUrl: './ide-context-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeContextMenuComponent implements OnDestroy {
  readonly items = input<IdeContextMenuItemDef[]>([]);
  readonly menuLabel = input<string>('Context menu');
  readonly itemSelected = output<string>();

  private static idCounter = 0;

  protected readonly menuId = `ide-context-menu-${++IdeContextMenuComponent.idCounter}`;
  protected readonly isOpen = signal(false);
  protected readonly ctx = createContextMenu({
    closeOnSelect: true,
    onOpenChange: (open) => this.isOpen.set(Boolean(open)),
  });

  protected readonly menu = createMenuList({
    ariaLabel: this.menuLabel(),
    items: [],
    onSelect: (id) => this.selectById(id),
  });

  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly overlayService = inject(OverlayService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly menuTemplate = viewChild.required<TemplateRef<unknown>>('menuTemplate');
  private overlayRef: OverlayRef | null = null;
  private anchorEl: HTMLElement | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.ngOnDestroy());
  }

  ngOnDestroy(): void {
    this.overlayRef?.destroy();
    this.anchorEl?.remove();
    this.overlayRef = null;
    this.anchorEl = null;
  }

  close(): void {
    this.ctx.actions.close();
    this.overlayRef?.close();
    this.isOpen.set(false);
  }

  protected onContextMenu(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.ctx.handleContextMenu(e);
    this.openAt(e.clientX, e.clientY);
  }

  protected onMenuKeyDown(event: KeyboardEvent): void {
    this.menu.handleMenuKeyDown(event);
    this.ctx.handleKeyDown(event);
    if (event.key === 'Escape' || event.key === 'Tab') this.close();
  }

  protected onItemClick(item: IdeContextMenuItemDef): void {
    if (item.disabled) return;
    this.menu.actions.selectItem(item.id);
  }

  protected toMenuItem(item: IdeContextMenuItemDef) {
    return {
      id: item.id,
      disabled: item.disabled,
      intent: item.intent,
    };
  }

  protected menuIndex(templateIndex: number): number {
    const item = this.items()[templateIndex];
    if (!item || item.separator) return -1;
    return this.items().slice(0, templateIndex + 1).filter((i) => !i.separator).length - 1;
  }

  private openAt(x: number, y: number): void {
    this.ensureAnchor();
    this.ensureOverlay();
    this.menu.actions.setItems(this.items().filter((i) => !i.separator).map((i) => this.toMenuItem(i)));
    this.anchorEl!.style.transform = `translate(${x}px, ${y}px)`;
    this.ctx.actions.open({ x, y });
    this.overlayRef?.open();
    this.isOpen.set(true);
    setTimeout(() => this.focusFirstItem());
  }

  private ensureAnchor(): void {
    if (this.anchorEl) return;
    this.anchorEl = document.createElement('span');
    this.anchorEl.setAttribute('aria-hidden', 'true');
    this.anchorEl.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 1px;
      height: 1px;
      pointer-events: none;
    `;
    this.hostRef.nativeElement.appendChild(this.anchorEl);
  }

  private ensureOverlay(): void {
    if (this.overlayRef) return;
    this.overlayRef = this.overlayService.create(
      this.menuTemplate(),
      this.viewContainerRef,
      this.anchorEl!,
      {
        placement: 'bottom-start',
        offset: 0,
        closeOnClickOutside: true,
        closeOnEscape: true,
        closeOnScroll: true,
        matchAnchorWidth: false,
      },
    );
    this.overlayRef.closed$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.ctx.actions.close();
      this.isOpen.set(false);
    });
  }

  private selectById(id: string): void {
    const item = this.items().find((candidate) => candidate.id === id);
    if (!item || item.disabled || item.separator) return;
    this.ctx.actions.selectItem(id);
    this.close();
    this.itemSelected.emit(id);
  }

  private focusFirstItem(): void {
    const first = document.querySelector<HTMLElement>(`#${this.menuId} [data-ide-menu-item]:not([data-disabled])`);
    first?.focus();
  }
}
