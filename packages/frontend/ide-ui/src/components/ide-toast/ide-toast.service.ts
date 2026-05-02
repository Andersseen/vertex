import { Injectable, OnDestroy, signal } from '@angular/core';
import { createToastManager } from '@andersseen/headless-components/toast';
import type { ToastItem, ToastType, ToastPosition } from '@andersseen/headless-components/toast';

export type { ToastItem, ToastType, ToastPosition };

@Injectable({ providedIn: 'root' })
export class IdeToastService implements OnDestroy {
  private readonly manager = createToastManager({
    defaultDuration: 3000,
    maxToasts: 5,
    position: 'bottom-right',
    onToastsChange: (toasts) => this.toasts.set([...toasts]),
  });

  readonly toasts = signal<ToastItem[]>([]);
  readonly position = signal<ToastPosition>('bottom-right');

  readonly containerProps = () => this.manager.getContainerProps();
  readonly toastProps = (t: ToastItem) => this.manager.getToastProps(t);
  readonly dismissProps = () => this.manager.getDismissProps();

  present(message: string, type: ToastType = 'default', duration?: number): number {
    return this.manager.actions.present(message, type, duration);
  }

  dismiss(id: number): void {
    this.manager.actions.dismiss(id);
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  dismissAll(): void {
    this.manager.actions.dismissAll();
    this.toasts.set([]);
  }

  ngOnDestroy(): void {
    this.manager.destroy();
  }
}
