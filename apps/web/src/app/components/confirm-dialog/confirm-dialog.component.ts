import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { IdeDialogComponent, IdeButtonComponent } from '@vertex/ide-ui';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [IdeDialogComponent, IdeButtonComponent],
  template: `
    <v-ide-dialog
      [visible]="visible()"
      [title]="title()"
      [closable]="true"
      [showFooter]="true"
      (visibleChange)="visibleChange.emit($event)"
    >
      <p class="confirm-message">{{ message() }}</p>

      <div ideDialogFooter class="confirm-footer">
        <v-ide-button variant="ghost" (clicked)="cancel()">Cancel</v-ide-button>
        <v-ide-button variant="accent" (clicked)="confirm()">{{ confirmLabel() }}</v-ide-button>
      </div>
    </v-ide-dialog>
  `,
  styles: `
    .confirm-message {
      margin: 0;
      color: var(--ide-text-muted, #888);
      font-size: 13px;
      line-height: 1.5;
    }
    .confirm-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  readonly visible = input<boolean>(false);
  readonly title = input<string>('');
  readonly message = input<string>('');
  readonly confirmLabel = input<string>('Confirm');

  readonly visibleChange = output<boolean>();
  readonly confirmed = output<void>();

  confirm(): void {
    this.confirmed.emit();
    this.visibleChange.emit(false);
  }

  cancel(): void {
    this.visibleChange.emit(false);
  }
}
