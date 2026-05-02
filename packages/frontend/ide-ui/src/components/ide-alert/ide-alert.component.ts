import { Component, input, output, effect, signal, ChangeDetectionStrategy } from '@angular/core';
import { createAlert } from '@andersseen/headless-components/alert';
import type { AlertVariant } from '@andersseen/headless-components/alert';

export type IdeAlertSeverity = 'error' | 'warning' | 'success' | 'info';

function toVariant(s: IdeAlertSeverity): AlertVariant {
  return s === 'error' ? 'destructive' : s;
}

@Component({
  selector: 'v-ide-alert',
  standalone: true,
  template: `
    @if (visible()) {
      <div
        class="ide-alert"
        [class.ide-alert--error]="severity() === 'error'"
        [class.ide-alert--warning]="severity() === 'warning'"
        [class.ide-alert--success]="severity() === 'success'"
        [class.ide-alert--info]="severity() === 'info'"
        [attr.role]="alert.getAlertProps().role"
        [attr.aria-live]="alert.getAlertProps()['aria-live']"
        [attr.aria-atomic]="alert.getAlertProps()['aria-atomic']"
      >
        <span class="ide-alert__icon" aria-hidden="true">
          @switch (severity()) {
            @case ('error') {
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
                <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            }
            @case ('warning') {
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5L13.5 12.5H.5L7 1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                <path d="M7 5.5v3M7 10v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            }
            @case ('success') {
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
                <path d="M4 7l2.5 2.5 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            }
            @case ('info') {
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
                <path d="M7 6v4M7 4v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            }
          }
        </span>
        <span class="ide-alert__text">{{ text() }}</span>
        @if (dismissible()) {
          <button
            class="ide-alert__dismiss"
            [attr.type]="alert.getDismissButtonProps().type"
            [attr.aria-label]="alert.getDismissButtonProps()['aria-label']"
            (click)="onDismiss()"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        }
      </div>
    }
  `,
  styleUrl: './ide-alert.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeAlertComponent {
  readonly severity = input<IdeAlertSeverity>('info');
  readonly text = input<string>('');
  readonly dismissible = input<boolean>(false);
  readonly dismissed = output<void>();

  protected readonly visible = signal(true);

  protected readonly alert = createAlert({
    variant: toVariant(this.severity()),
    dismissible: this.dismissible(),
    onDismiss: () => {
      this.visible.set(false);
      this.dismissed.emit();
    },
  });

  constructor() {
    effect(() => {
      this.alert.actions.setVariant(toVariant(this.severity()));
      this.alert.actions.setDismissible(this.dismissible());
    });
  }

  protected onDismiss(): void {
    this.alert.actions.dismiss();
  }
}
