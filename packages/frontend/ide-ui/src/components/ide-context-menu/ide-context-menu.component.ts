import {
  Component,
  input,
  output,
  signal,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, filter } from 'rxjs';
import { createContextMenu } from '@andersseen/headless-components/context-menu';

export interface IdeContextMenuItemDef {
  id: string;
  label: string;
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

      @if (isOpen()) {
        <div
          class="ide-context-menu__panel"
          [style.left.px]="position().x"
          [style.top.px]="position().y"
          [attr.role]="ctx.getPanelProps().role"
          [attr.aria-label]="ctx.getPanelProps()['aria-label']"
        >
          @for (item of items(); track item.id) {
            @if (item.separator) {
              <div class="ide-context-menu__separator" role="separator"></div>
            } @else {
              <button
                class="ide-context-menu__item"
                [class.ide-context-menu__item--disabled]="item.disabled"
                [attr.aria-disabled]="item.disabled || null"
                (click)="onItemClick(item)"
              >
                {{ item.label }}
              </button>
            }
          }
        </div>
      }
    </div>
  `,
  styleUrl: './ide-context-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeContextMenuComponent {
  readonly items = input<IdeContextMenuItemDef[]>([]);
  readonly menuLabel = input<string>('Context menu');
  readonly itemSelected = output<string>();

  protected readonly isOpen = signal(false);
  protected readonly position = signal({ x: 0, y: 0 });
  protected readonly ctx = createContextMenu({
    closeOnSelect: true,
    onOpenChange: (open) => this.isOpen.set(open),
    onPosition: (pos) => this.position.set(pos),
  });

  constructor() {
    const platformId = inject(PLATFORM_ID);
    if (!isPlatformBrowser(platformId)) return;

    const doc = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);

    fromEvent<MouseEvent>(doc, 'click').pipe(
      filter(() => this.isOpen()),
      takeUntilDestroyed(destroyRef),
    ).subscribe(() => {
      this.ctx.actions.close();
      this.isOpen.set(false);
    });

    fromEvent<KeyboardEvent>(doc, 'keydown').pipe(
      takeUntilDestroyed(destroyRef),
    ).subscribe((e) => {
      this.ctx.handleKeyDown(e);
      if (e.key === 'Escape') this.isOpen.set(false);
    });
  }

  protected onContextMenu(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.ctx.handleContextMenu(e);
    this.isOpen.set(true);
  }

  protected onItemClick(item: IdeContextMenuItemDef): void {
    if (item.disabled) return;
    this.ctx.actions.selectItem(item.id);
    this.isOpen.set(false);
    this.itemSelected.emit(item.id);
  }
}
