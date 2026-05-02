import {
  Component,
  input,
  signal,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { createTooltip } from '@andersseen/headless-components/tooltip';

export type IdeTooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

@Component({
  selector: 'v-ide-tooltip',
  standalone: true,
  template: `
    <div
      class="ide-tooltip__host"
      [attr.aria-describedby]="tip.getTriggerProps()['aria-describedby']"
      (mouseenter)="tip.handleMouseEnter()"
      (mouseleave)="tip.handleMouseLeave()"
      (focusin)="tip.handleFocusIn()"
      (focusout)="tip.handleFocusOut()"
    >
      <ng-content />
      @if (isVisible()) {
        <div
          class="ide-tooltip__content"
          [class.ide-tooltip__content--top]="placement() === 'top'"
          [class.ide-tooltip__content--bottom]="placement() === 'bottom'"
          [class.ide-tooltip__content--left]="placement() === 'left'"
          [class.ide-tooltip__content--right]="placement() === 'right'"
          [attr.role]="tip.getTooltipProps().role"
          [attr.id]="tip.getTooltipProps().id"
          aria-hidden="false"
        >
          {{ text() }}
        </div>
      }
    </div>
  `,
  styleUrl: './ide-tooltip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeTooltipComponent {
  readonly text = input.required<string>();
  readonly placement = input<IdeTooltipPlacement>('top');
  readonly openDelay = input<number>(200);
  readonly closeDelay = input<number>(100);

  protected readonly isVisible = signal(false);
  protected readonly tip = createTooltip({
    placement: this.placement(),
    openDelay: this.openDelay(),
    closeDelay: this.closeDelay(),
    onVisibilityChange: (v) => this.isVisible.set(v as boolean),
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.tip.destroy());
  }
}
