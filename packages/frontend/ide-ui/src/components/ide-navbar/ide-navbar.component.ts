import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'v-ide-navbar',
  standalone: true,
  template: `
    <nav class="ide-navbar">
      <div class="ide-navbar__start">
        <ng-content select="[navStart]" />
      </div>
      <div class="ide-navbar__center">
        <ng-content select="[navCenter]" />
      </div>
      <div class="ide-navbar__end">
        <ng-content select="[navEnd]" />
      </div>
    </nav>
  `,
  styleUrl: './ide-navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeNavbarComponent {}
