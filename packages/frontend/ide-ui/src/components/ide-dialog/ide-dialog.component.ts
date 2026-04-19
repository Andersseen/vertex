import {
  Component,
  input,
  output,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { createModal } from '@andersseen/headless-components/modal';

@Component({
  selector: 'ide-dialog',
  standalone: true,
  template: `
    @if (modal.state.isOpen) {
      <div
        class="ide-dialog__overlay"
        [attr.data-state]="modal.getOverlayProps()['data-state']"
        [attr.aria-hidden]="modal.getOverlayProps()['aria-hidden']"
        (click)="modal.handleOverlayClick()"
      ></div>

      <div
        class="ide-dialog__content"
        role="dialog"
        [attr.aria-modal]="modal.getContentProps()['aria-modal']"
        [attr.aria-hidden]="modal.getContentProps()['aria-hidden']"
        [attr.data-state]="modal.getContentProps()['data-state']"
        [attr.tabindex]="modal.getContentProps().tabindex"
        (keydown)="modal.handleKeyDown($event)"
      >
        <header class="ide-dialog__header">
          <h2 class="ide-dialog__title">{{ title() }}</h2>
          @if (closable()) {
            <button
              class="ide-dialog__close"
              type="button"
              [attr.aria-label]="modal.getCloseButtonProps()['aria-label']"
              (click)="modal.actions.close()"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          }
        </header>

        <div class="ide-dialog__body">
          <ng-content />
        </div>

        @if (showFooter()) {
          <footer class="ide-dialog__footer">
            <ng-content select="[ideDialogFooter]" />
          </footer>
        }
      </div>
    }
  `,
  styleUrl: './ide-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeDialogComponent {
  readonly visible = input<boolean>(false);
  readonly title = input<string>('');
  readonly closable = input<boolean>(true);
  readonly showFooter = input<boolean>(false);
  readonly visibleChange = output<boolean>();

  protected modal = createModal({
    defaultOpen: this.visible(),
    closeOnEscape: true,
    closeOnOverlayClick: true,
    onOpenChange: (isOpen) => this.visibleChange.emit(isOpen as boolean),
  });

  constructor() {
    effect(() => {
      const v = this.visible();
      if (v && !this.modal.state.isOpen) this.modal.actions.open();
      if (!v && this.modal.state.isOpen) this.modal.actions.close();
    });
  }
}
