import {
  Component,
  input,
  output,
  effect,
  inject,
  DestroyRef,
  PLATFORM_ID,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, filter } from 'rxjs';
import { createDrawer } from '@andersseen/headless-components/drawer';

export type IdeDrawerPlacement = 'left' | 'right' | 'top' | 'bottom';

@Component({
  selector: 'v-ide-drawer',
  standalone: true,
  template: `
    @if (visible()) {
      <div
        class="ide-drawer__overlay"
        [attr.data-state]="visible() ? 'open' : 'closed'"
        aria-hidden="true"
        (click)="onOverlayClick()"
      ></div>
      <div
        class="ide-drawer__panel"
        [class.ide-drawer__panel--left]="placement() === 'left'"
        [class.ide-drawer__panel--right]="placement() === 'right'"
        [class.ide-drawer__panel--top]="placement() === 'top'"
        [class.ide-drawer__panel--bottom]="placement() === 'bottom'"
        role="dialog"
        aria-modal="true"
        [attr.data-state]="visible() ? 'open' : 'closed'"
        [attr.data-side]="placement()"
        tabindex="-1"
      >
        <div class="ide-drawer__header">
          @if (title()) {
            <h2 class="ide-drawer__title">{{ title() }}</h2>
          }
          <button
            class="ide-drawer__close"
            [attr.aria-label]="drawer.getCloseButtonProps()['aria-label']"
            type="button"
            (click)="close()"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="ide-drawer__content">
          <ng-content />
        </div>
      </div>
    }
  `,
  styleUrl: './ide-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeDrawerComponent {
  readonly visible = input<boolean>(false);
  readonly title = input<string>('');
  readonly placement = input<IdeDrawerPlacement>('left');
  readonly visibleChange = output<boolean>();

  protected readonly drawer = createDrawer({
    placement: this.placement(),
    closeOnEscape: true,
    closeOnOverlayClick: true,
    onOpenChange: (open) => this.visibleChange.emit(open as boolean),
  });

  constructor() {
    // Sync visible input with headless state so ARIA checks inside the library work correctly.
    effect(() => {
      if (this.visible()) {
        this.drawer.actions.open();
      } else {
        this.drawer.actions.close();
      }
    });

    const platformId = inject(PLATFORM_ID);
    if (!isPlatformBrowser(platformId)) return;

    const doc = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);

    fromEvent<KeyboardEvent>(doc, 'keydown').pipe(
      filter(() => this.visible()),
      takeUntilDestroyed(destroyRef),
    ).subscribe((e) => this.drawer.handleKeyDown(e));
  }

  protected onOverlayClick(): void {
    this.drawer.handleOverlayClick();
  }

  protected close(): void {
    this.drawer.actions.close();
    this.visibleChange.emit(false);
  }
}
