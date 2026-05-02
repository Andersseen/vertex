import {
  Component,
  input,
  output,
  signal,
  inject,
  ElementRef,
  ViewContainerRef,
  DestroyRef,
  contentChild,
  viewChild,
  TemplateRef,
  ChangeDetectionStrategy,
  effect,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OverlayService, OverlayRef } from 'quartz-headless';
import type { OverlayPlacement } from 'quartz-headless';

export type IdePopoverPlacement = OverlayPlacement;

@Component({
  selector: 'v-ide-popover',
  standalone: true,
  template: `
    <div class="ide-popover__trigger" #triggerEl (click)="toggle()">
      <ng-content select="[popoverTrigger]" />
    </div>
  `,
  styleUrl: './ide-popover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdePopoverComponent {
  readonly placement = input<IdePopoverPlacement>('bottom-start');
  readonly offset = input<number>(4);
  readonly opened = output<void>();
  readonly closed = output<void>();

  protected readonly _isOpen = signal(false);
  readonly isOpen = this._isOpen.asReadonly();

  private readonly vcr = inject(ViewContainerRef);
  private readonly overlayService = inject(OverlayService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly panelTpl = contentChild<TemplateRef<unknown>>('popoverPanel');
  private readonly triggerEl = viewChild<ElementRef<HTMLElement>>('triggerEl');
  private overlayRef?: OverlayRef;

  constructor() {
    effect(() => {
      const tpl = this.panelTpl();
      const trigger = this.triggerEl();
      if (tpl && trigger && !this.overlayRef) {
        this.overlayRef = this.overlayService.create(
          tpl,
          this.vcr,
          trigger.nativeElement,
          { placement: this.placement(), offset: this.offset() },
        );
        this.overlayRef.closed$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
          this._isOpen.set(false);
          this.closed.emit();
        });
      }
    });

    this.destroyRef.onDestroy(() => this.overlayRef?.destroy());
  }

  toggle(): void {
    if (!this.overlayRef) return;
    if (this._isOpen()) {
      this.overlayRef.close();
    } else {
      this.overlayRef.open();
      this._isOpen.set(true);
      this.opened.emit();
    }
  }

  open(): void {
    if (!this._isOpen()) this.toggle();
  }

  close(): void {
    if (this._isOpen()) this.toggle();
  }
}
