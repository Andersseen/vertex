import { Directive, ElementRef, inject, input, effect, OnInit } from '@angular/core';
import { outputFromObservable, toObservable } from '@angular/core/rxjs-interop';
import { skip, filter, map } from 'rxjs';
import { SplitterService } from './splitter.service';
import { SplitterOrientation } from './splitter.types';

@Directive({
  selector: '[vSplitterContainer]',
  providers: [SplitterService],
  host: {
    '[class.qz-splitter-container]': 'true',
    '[class.qz-splitter-container--horizontal]': 'orientation() === "horizontal"',
    '[class.qz-splitter-container--vertical]': 'orientation() === "vertical"',
    '[class.qz-splitter-container--dragging]': 'splitterService.isDragging()',
    '[style.display]': '"flex"',
    '[style.flex-direction]': 'orientation() === "horizontal" ? "row" : "column"',
    '[style.width]': '"100%"',
    '[style.height]': '"100%"',
    '[style.overflow]': '"hidden"',
  },
})
export class SplitterContainerDirective implements OnInit {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  readonly splitterService = inject(SplitterService);

  readonly orientation = input<SplitterOrientation>('horizontal');
  readonly minSize = input<number>(0);
  readonly maxSize = input<number>(100);
  readonly step = input<number>(1);
  readonly defaultPosition = input<number>(50);

  readonly positionChange = outputFromObservable(
    toObservable(this.splitterService.position).pipe(skip(1)),
  );

  private readonly isDragging$ = toObservable(this.splitterService.isDragging).pipe(skip(1));

  readonly dragStart = outputFromObservable(
    this.isDragging$.pipe(
      filter((v) => v),
      map(() => void 0 as void),
    ),
  );
  readonly dragEnd = outputFromObservable(
    this.isDragging$.pipe(
      filter((v) => !v),
      map(() => void 0 as void),
    ),
  );

  constructor() {
    effect(() => {
      this.splitterService.updateConfig({
        minSize: this.minSize(),
        maxSize: this.maxSize(),
        step: this.step(),
        defaultPosition: this.defaultPosition(),
      });
    });

    effect(() => {
      this.splitterService.setOrientation(this.orientation());
    });
  }

  ngOnInit(): void {
    // Inputs are resolved here — constructor reads signal defaults, not bound values
    this.splitterService.setPosition(this.defaultPosition());
  }

  updateContainerRect(): void {
    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    this.splitterService.setContainerRect(rect);
  }
}
