import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  ElementRef,
  DestroyRef,
  ChangeDetectionStrategy,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, filter } from 'rxjs';
import { createDropdown } from '@andersseen/headless-components/dropdown';

export interface IdeDropdownItemDef {
  id: string;
  label: string;
  disabled?: boolean;
  separator?: boolean;
}

export type IdeDropdownPlacement = 'top' | 'bottom' | 'left' | 'right';

@Component({
  selector: 'v-ide-dropdown',
  standalone: true,
  template: `
    <div class="ide-dropdown">
      <div
        class="ide-dropdown__trigger"
        [attr.aria-haspopup]="dropdown.getTriggerProps()['aria-haspopup']"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-disabled]="dropdown.getTriggerProps()['aria-disabled'] || null"
        (click)="onTriggerClick()"
        (keydown)="dropdown.handleTriggerKeyDown($event)"
      >
        <ng-content select="[dropdownTrigger]" />
      </div>

      @if (isOpen()) {
        <div
          class="ide-dropdown__menu"
          [class.ide-dropdown__menu--top]="placement() === 'top'"
          [class.ide-dropdown__menu--left]="placement() === 'left'"
          [class.ide-dropdown__menu--right]="placement() === 'right'"
          [attr.role]="dropdown.getMenuProps().role"
          (keydown)="dropdown.handleMenuKeyDown($event, itemIds())"
        >
          @for (item of items(); track item.id) {
            @if (item.separator) {
              <div class="ide-dropdown__separator" role="separator"></div>
            } @else {
              <button
                class="ide-dropdown__item"
                [class.ide-dropdown__item--disabled]="item.disabled"
                [attr.role]="dropdown.getItemProps(item.id).role"
                [attr.tabindex]="dropdown.getItemProps(item.id).tabindex"
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
  styleUrl: './ide-dropdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeDropdownComponent {
  readonly items = input<IdeDropdownItemDef[]>([]);
  readonly placement = input<IdeDropdownPlacement>('bottom');
  readonly itemSelected = output<string>();

  protected readonly isOpen = signal(false);
  protected readonly dropdown = createDropdown({ placement: this.placement() });
  protected readonly itemIds = computed(() => this.items().filter(i => !i.separator).map(i => i.id));

  private readonly el = inject(ElementRef<HTMLElement>);

  constructor() {
    const platformId = inject(PLATFORM_ID);
    if (!isPlatformBrowser(platformId)) return;

    const doc = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);

    fromEvent<MouseEvent>(doc, 'click').pipe(
      filter((e) => !this.el.nativeElement.contains(e.target as Node)),
      takeUntilDestroyed(destroyRef),
    ).subscribe(() => this.close());

    fromEvent<KeyboardEvent>(doc, 'keydown').pipe(
      filter((e) => e.key === 'Escape'),
      takeUntilDestroyed(destroyRef),
    ).subscribe(() => this.close());
  }

  protected onTriggerClick(): void {
    this.isOpen.update((v) => !v);
    if (this.isOpen()) {
      this.dropdown.actions.open();
    } else {
      this.dropdown.actions.close();
    }
  }

  protected onItemClick(item: IdeDropdownItemDef): void {
    if (item.disabled) return;
    this.dropdown.actions.selectItem(item.id);
    this.close();
    this.itemSelected.emit(item.id);
  }

  private close(): void {
    this.isOpen.set(false);
    this.dropdown.actions.close();
  }
}
