import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'v-ide-toolbar',
  standalone: true,
  template: `
    <div class="ide-toolbar" role="toolbar" aria-label="Main toolbar">
      <div class="ide-toolbar__start">
        <ng-content select="[ideToolbarStart]" />
      </div>
      <div class="ide-toolbar__center">
        <ng-content select="[ideToolbarCenter]" />
      </div>
      <div class="ide-toolbar__end">
        <ng-content select="[ideToolbarEnd]" />
      </div>
    </div>
  `,
  styleUrl: './ide-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeToolbarComponent {}
