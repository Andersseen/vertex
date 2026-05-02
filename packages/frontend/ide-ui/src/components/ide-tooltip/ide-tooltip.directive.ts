import { Directive } from '@angular/core';
import { TooltipDirective } from 'quartz-headless';

@Directive({
  selector: '[vIdeTooltip]',
  standalone: true,
  hostDirectives: [
    {
      directive: TooltipDirective,
      inputs: [
        'qzTooltip: vIdeTooltip',
        'tooltipPlacement',
        'tooltipDelay',
        'tooltipHideDelay',
        'tooltipOffset',
        'tooltipDisabled',
      ],
    },
  ],
})
export class IdeTooltipDirective {}
