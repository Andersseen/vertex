import {
  Component,
  signal,
  input,
  output,
  ChangeDetectionStrategy,
  effect,
} from '@angular/core';
import { IdeDialogComponent, IdeInputComponent, IdeButtonComponent } from '@vertex/ide-ui';

@Component({
  selector: 'app-prompt-dialog',
  standalone: true,
  imports: [IdeDialogComponent, IdeInputComponent, IdeButtonComponent],
  template: `
    <v-ide-dialog
      [visible]="visible()"
      [title]="title()"
      [closable]="true"
      [showFooter]="true"
      (visibleChange)="visibleChange.emit($event)"
    >
      <p class="prompt-message">{{ message() }}</p>
      <v-ide-input
        [value]="value()"
        [placeholder]="placeholder()"
        (valueChange)="inputValue.set($event)"
        (enterPressed)="confirm()"
      />

      <div ideDialogFooter class="prompt-footer">
        <v-ide-button variant="ghost" (clicked)="cancel()">Cancel</v-ide-button>
        <v-ide-button variant="accent" (clicked)="confirm()">{{ confirmLabel() }}</v-ide-button>
      </div>
    </v-ide-dialog>
  `,
  styles: `
    .prompt-message {
      margin: 0 0 12px;
      color: var(--ide-text-muted, #888);
      font-size: 13px;
    }
    .prompt-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromptDialogComponent {
  readonly visible = input<boolean>(false);
  readonly title = input<string>('');
  readonly message = input<string>('');
  readonly placeholder = input<string>('');
  readonly confirmLabel = input<string>('OK');
  readonly value = input<string>('');

  readonly visibleChange = output<boolean>();
  readonly confirmValue = output<string>();

  protected readonly inputValue = signal('');

  constructor() {
    effect(() => {
      this.inputValue.set(this.value());
    });
  }

  confirm(): void {
    this.confirmValue.emit(this.inputValue());
    this.visibleChange.emit(false);
  }

  cancel(): void {
    this.visibleChange.emit(false);
  }
}
