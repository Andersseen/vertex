import {
  Component,
  input,
  contentChild,
  TemplateRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { VirtualScrollDirective } from 'quartz-headless';

@Component({
  selector: 'v-ide-virtual-list',
  standalone: true,
  imports: [VirtualScrollDirective, NgTemplateOutlet],
  template: `
    <div
      class="ide-virtual-list"
      qzVirtualScroll
      [items]="items()"
      [itemSize]="itemHeight()"
      [buffer]="buffer()"
      [style.height]="height()"
      #vs="qzVirtualScroll"
    >
      <div class="ide-virtual-list__content" [style.height.px]="vs.contentHeight()">
        @for (row of vs.visibleItems(); track row.index) {
          <div
            class="ide-virtual-list__row"
            [style.top.px]="row.offset"
            [style.height.px]="itemHeight()"
          >
            @if (itemTemplate()) {
              <ng-container
                [ngTemplateOutlet]="itemTemplate()!"
                [ngTemplateOutletContext]="{ $implicit: row.item, index: row.index }"
              />
            } @else {
              <span class="ide-virtual-list__text">{{ row.item }}</span>
            }
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './ide-virtual-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeVirtualListComponent {
  readonly items = input.required<unknown[]>();
  readonly itemHeight = input<number>(32);
  readonly buffer = input<number>(5);
  readonly height = input<string>('300px');

  protected readonly itemTemplate = contentChild<TemplateRef<unknown>>('itemTemplate');
}
