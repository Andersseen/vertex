import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import type { IVirtualFS } from '@vertex/runtime';

@Component({
  selector: 'app-preview-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="preview-placeholder">
      <p>
        Preview engine is being upgraded to WebContainers.
        Functionality returns in phase 2 of the preview-wc plan.
      </p>
    </div>
  `,
  styles: `
    .preview-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--ide-text-muted, #888);
      font-size: 13px;
      text-align: center;
      padding: 24px;
    }
  `,
})
export class PreviewPanelComponent {
  readonly virtualFs = input<IVirtualFS | null>(null);
}
