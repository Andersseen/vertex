import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { IdeToastService } from './ide-toast.service';
import type { ToastItem } from './ide-toast.service';

@Component({
  selector: 'v-ide-toaster',
  standalone: true,
  template: `
    @if (toast.toasts().length > 0) {
      <div
        class="ide-toaster"
        [attr.role]="toast.containerProps().role"
        [attr.aria-label]="toast.containerProps()['aria-label']"
        [attr.aria-live]="toast.containerProps()['aria-live']"
        [attr.data-position]="toast.containerProps()['data-position']"
      >
        @for (item of toast.toasts(); track item.id) {
          <div
            class="ide-toast"
            [class.ide-toast--success]="item.type === 'success'"
            [class.ide-toast--error]="item.type === 'error'"
            [class.ide-toast--warning]="item.type === 'warning'"
            [class.ide-toast--info]="item.type === 'info'"
            [attr.role]="toast.toastProps(item).role"
            [attr.aria-live]="toast.toastProps(item)['aria-live']"
            [attr.data-type]="item.type"
          >
            <span class="ide-toast__message">{{ item.message }}</span>
            <button
              class="ide-toast__dismiss"
              [attr.aria-label]="toast.dismissProps()['aria-label']"
              [attr.type]="toast.dismissProps().type"
              (click)="toast.dismiss(item.id)"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        }
      </div>
    }
  `,
  styleUrl: './ide-toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeToasterComponent {
  protected readonly toast = inject(IdeToastService);

  protected trackById(_: number, item: ToastItem): number {
    return item.id;
  }
}
