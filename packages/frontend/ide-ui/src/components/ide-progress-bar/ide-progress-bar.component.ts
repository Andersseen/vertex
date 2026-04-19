import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'ide-progress-bar',
  standalone: true,
  template: `
    <div class="ide-progress-bar" role="progressbar" [attr.aria-valuenow]="value()" aria-valuemin="0" aria-valuemax="100">
      <div class="ide-progress-bar__track">
        <div class="ide-progress-bar__fill" [style.width.%]="value()"></div>
      </div>
      @if (showLabel()) {
        <span class="ide-progress-bar__label">{{ value() }}%</span>
      }
    </div>
  `,
  styleUrl: './ide-progress-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeProgressBarComponent {
  readonly value = input<number>(0);
  readonly showLabel = input<boolean>(false);
}
