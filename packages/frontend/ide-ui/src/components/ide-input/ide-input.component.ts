import {
  Component,
  input,
  output,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'v-ide-input',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="ide-input">
      @if (label()) {
        <label class="ide-input__label" [for]="inputId">{{ label() }}</label>
      }
      <input
        class="ide-input__field"
        [id]="inputId"
        [type]="type()"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [(ngModel)]="innerValue"
        (ngModelChange)="valueChange.emit($event)"
        (keydown.enter)="enterPressed.emit()"
      />
    </div>
  `,
  styleUrl: './ide-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeInputComponent {
  readonly label = input<string>('');
  readonly type = input<string>('text');
  readonly placeholder = input<string>('');
  readonly value = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly valueChange = output<string>();
  readonly enterPressed = output<void>();

  private static idCounter = 0;

  protected innerValue = '';
  protected inputId = `ide-input-${++IdeInputComponent.idCounter}`;

  constructor() {
    effect(() => {
      this.innerValue = this.value();
    });
  }
}
