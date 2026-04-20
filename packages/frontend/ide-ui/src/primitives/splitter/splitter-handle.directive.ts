import { Directive, ElementRef, inject, effect, Renderer2, OnDestroy } from '@angular/core';
import { SplitterService } from './splitter.service';
import { SplitterContainerDirective } from './splitter-container.directive';

@Directive({
  selector: '[vSplitterHandle]',
  host: {
    '[class.qz-splitter-handle]': 'true',
    '[class.qz-splitter-handle--dragging]': 'splitterService.isDragging()',
    '[class.qz-splitter-handle--horizontal]': 'splitterService.isHorizontal()',
    '[class.qz-splitter-handle--vertical]': 'splitterService.isVertical()',
    '[attr.role]': '"separator"',
    '[attr.tabindex]': '0',
    '[attr.aria-valuemin]': 'splitterService.minSize()',
    '[attr.aria-valuemax]': 'splitterService.maxSize()',
    '[attr.aria-valuenow]': 'splitterService.position()',
    '[attr.aria-orientation]': 'splitterService.orientation()',
    '[style.flex-shrink]': '"0"',
    '[style.cursor]': 'splitterService.isHorizontal() ? "col-resize" : "row-resize"',
    '[style.user-select]': '"none"',
    '[style.touch-action]': '"none"',

    '(mousedown)': 'onMouseDown($event)',
    '(touchstart)': 'onTouchStart($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class SplitterHandleDirective implements OnDestroy {
  private elementRef = inject(ElementRef<HTMLElement>);
  private renderer = inject(Renderer2);
  protected splitterService = inject(SplitterService);
  private container = inject(SplitterContainerDirective, { optional: true });

  private isDragging = false;
  private unlisteners: (() => void)[] = [];

  constructor() {
    effect(() => {
      if (this.splitterService.isDragging()) {
        this.updateContainerRect();
      }
    });
  }

  ngOnDestroy(): void {
    this.removeListeners();
  }

  private updateContainerRect(): void {
    if (this.container) {
      this.container.updateContainerRect();
    }
  }

  onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.startDrag();
    this.addDocumentListeners();
  }

  onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.startDrag();
    this.addTouchListeners();
  }

  onKeydown(event: KeyboardEvent): void {
    const step = this.splitterService.step();
    let newPosition = this.splitterService.position();
    const isHorizontal = this.splitterService.isHorizontal();

    switch (event.key) {
      case isHorizontal ? 'ArrowLeft' : 'ArrowUp':
        newPosition -= step;
        break;
      case isHorizontal ? 'ArrowRight' : 'ArrowDown':
        newPosition += step;
        break;
      case 'Home':
        newPosition = this.splitterService.minSize();
        break;
      case 'End':
        newPosition = this.splitterService.maxSize();
        break;
      default:
        return;
    }

    event.preventDefault();
    this.updateContainerRect();
    this.splitterService.setPosition(newPosition);
  }

  private startDrag(): void {
    if (this.isDragging) return;
    this.isDragging = true;
    this.updateContainerRect();
    this.splitterService.startDragging();
  }

  private stopDrag(): void {
    this.isDragging = false;
    this.splitterService.stopDragging();
    this.removeListeners();
  }

  private addDocumentListeners(): void {
    this.unlisteners.push(
      this.renderer.listen('document', 'mousemove', (e) => this.onMouseMove(e)),
      this.renderer.listen('document', 'mouseup', () => this.onMouseUp()),
    );
  }

  private addTouchListeners(): void {
    this.unlisteners.push(
      this.renderer.listen('document', 'touchmove', (e) => this.onTouchMove(e)),
      this.renderer.listen('document', 'touchend', () => this.onTouchEnd()),
      this.renderer.listen('document', 'touchcancel', () => this.onTouchEnd()),
    );
  }

  private removeListeners(): void {
    this.unlisteners.forEach((unlisten) => unlisten());
    this.unlisteners = [];
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    const newPosition = this.splitterService.calculatePositionFromEvent(
      event.clientX,
      event.clientY,
    );
    this.splitterService.setPosition(newPosition);
  }

  private onMouseUp(): void {
    this.stopDrag();
  }

  private onTouchMove(event: TouchEvent): void {
    if (!this.isDragging) return;
    const touch = event.touches[0];
    if (touch) {
      const newPosition = this.splitterService.calculatePositionFromTouch(touch);
      this.splitterService.setPosition(newPosition);
    }
  }

  private onTouchEnd(): void {
    this.stopDrag();
  }
}
