import { Directive, inject, input, booleanAttribute, computed } from '@angular/core';
import { SplitterService } from './splitter.service';

@Directive({
  selector: '[qzSplitterPanel]',
  host: {
    '[class.qz-splitter-panel]': 'true',
    '[class.qz-splitter-panel--primary]': 'isPrimary()',
    '[class.qz-splitter-panel--secondary]': '!isPrimary()',
    '[style.overflow]': '"hidden"',
    '[style.flex]': '"none"',
    '[style.width]': 'widthStyle()',
    '[style.height]': 'heightStyle()',
    '[style.min-width]': '"0"',
    '[style.min-height]': '"0"',
    '[style.max-width]': '"none"',
    '[style.max-height]': '"none"',
    '[style.box-sizing]': '"border-box"',
  },
})
export class SplitterPanelDirective {
  protected splitterService = inject(SplitterService);

  isPrimary = input<boolean, string | boolean>(true, {
    alias: 'qzSplitterPanel',
    transform: booleanAttribute,
  });

  private panelSize = computed(() => {
    const pos = this.splitterService.position();
    return this.isPrimary() ? pos : 100 - pos;
  });

  widthStyle = computed(() => {
    if (this.splitterService.isHorizontal()) {
      return `${this.panelSize()}%`;
    }
    return '100%';
  });

  heightStyle = computed(() => {
    if (this.splitterService.isVertical()) {
      return `${this.panelSize()}%`;
    }
    return '100%';
  });
}
