import {
  Component,
  input,
  inject,
  signal,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { IDE_ACCORDION_CTX } from './ide-accordion.context';

@Component({
  selector: 'v-ide-accordion-item',
  standalone: true,
  template: `
    <div class="ide-accordion-item" [class.ide-accordion-item--open]="open()">
      <button
        class="ide-accordion-item__trigger"
        [class.ide-accordion-item__trigger--disabled]="disabled()"
        [attr.aria-expanded]="open()"
        [attr.aria-disabled]="disabled() || null"
        [attr.id]="triggerId()"
        [attr.aria-controls]="panelId()"
        (click)="onToggle()"
      >
        <span class="ide-accordion-item__label">{{ label() }}</span>
        <svg
          class="ide-accordion-item__chevron"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div
        class="ide-accordion-item__panel"
        [attr.id]="panelId()"
        [attr.aria-labelledby]="triggerId()"
        role="region"
        [hidden]="!open()"
      >
        <div class="ide-accordion-item__content">
          <ng-content />
        </div>
      </div>
    </div>
  `,
  styleUrl: './ide-accordion-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeAccordionItemComponent {
  readonly itemId = input.required<string>();
  readonly label = input.required<string>();
  readonly disabled = input<boolean>(false);

  private readonly ctx = inject(IDE_ACCORDION_CTX);
  protected readonly open = signal(false);

  protected readonly triggerId = () => `ide-acc-trigger-${this.itemId()}`;
  protected readonly panelId = () => `ide-acc-panel-${this.itemId()}`;

  constructor() {
    // stateVersion increments on every accordion toggle, making this effect
    // re-run so all items stay in sync (needed for exclusive/single-open mode).
    effect(() => {
      this.ctx.stateVersion();
      this.open.set(this.ctx.isOpen(this.itemId()));
    });
  }

  protected onToggle(): void {
    if (this.disabled()) return;
    this.ctx.toggle(this.itemId());
    this.open.set(this.ctx.isOpen(this.itemId()));
  }
}
