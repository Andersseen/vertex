import {
  Component,
  input,
  output,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { createButton } from '@andersseen/headless-components/button';

export type IdeButtonVariant = 'default' | 'ghost' | 'accent';

@Component({
  selector: 'ide-button',
  standalone: true,
  template: `
    <button
      class="ide-button"
      [class.ide-button--ghost]="variant() === 'ghost'"
      [class.ide-button--accent]="variant() === 'accent'"
      [class.ide-button--loading]="button.state.loading"
      [class.ide-button--disabled]="button.state.disabled"
      [type]="button.getButtonProps().type"
      [disabled]="button.getButtonProps().disabled"
      [attr.tabindex]="button.getButtonProps().tabindex"
      [attr.aria-busy]="button.getButtonProps()['aria-busy']"
      [attr.aria-label]="ariaLabel() || null"
      (click)="button.actions.click($event)"
    >
      @if (button.state.loading) {
        <span class="ide-button__spinner" aria-hidden="true"></span>
      }
      <span class="ide-button__content">
        <ng-content />
      </span>
    </button>
  `,
  styleUrl: './ide-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeButtonComponent {
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly variant = input<IdeButtonVariant>('default');
  readonly ariaLabel = input<string>('');
  readonly clicked = output<MouseEvent>();

  protected button = createButton({
    disabled: this.disabled(),
    loading: this.loading(),
    onClick: (e) => this.clicked.emit(e as MouseEvent),
  });

  constructor() {
    effect(() => {
      this.button.actions.setDisabled(this.disabled());
      this.button.actions.setLoading(this.loading());
    });
  }
}
