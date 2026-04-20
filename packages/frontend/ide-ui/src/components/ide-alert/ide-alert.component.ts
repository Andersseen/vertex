import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

export type IdeAlertSeverity = 'error' | 'warning' | 'success' | 'info';

@Component({
  selector: 'v-ide-alert',
  standalone: true,
  template: `
    <div
      class="ide-alert"
      [class.ide-alert--error]="severity() === 'error'"
      [class.ide-alert--warning]="severity() === 'warning'"
      [class.ide-alert--success]="severity() === 'success'"
      [class.ide-alert--info]="severity() === 'info'"
      role="alert"
    >
      <span class="ide-alert__icon" aria-hidden="true">
        {{ icon() }}
      </span>
      <span class="ide-alert__text">{{ text() }}</span>
      @if (dismissible()) {
        <button class="ide-alert__dismiss" (click)="dismissed.emit()" aria-label="Dismiss alert">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      }
    </div>
  `,
  styleUrl: './ide-alert.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeAlertComponent {
  readonly severity = input<IdeAlertSeverity>('info');
  readonly text = input<string>('');
  readonly dismissible = input<boolean>(false);
  readonly dismissed = output<void>();

  protected icon = () => {
    const map: Record<IdeAlertSeverity, string> = {
      error: '●',
      warning: '●',
      success: '●',
      info: '●',
    };
    return map[this.severity()];
  };
}
