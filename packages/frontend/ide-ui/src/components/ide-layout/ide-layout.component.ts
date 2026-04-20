import {
  Component,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';

@Component({
  selector: 'v-ide-layout',
  standalone: true,
  template: `
    <div class="ide-layout">
      <header class="ide-layout__header">
        <ng-content select="[ideHeader]" />
      </header>

      <div class="ide-layout__body">
        <aside
          class="ide-layout__sidebar"
          [class.ide-layout__sidebar--collapsed]="sidebarCollapsed()"
          [style.width.px]="sidebarCollapsed() ? sidebarCollapsedWidth() : sidebarWidth()"
        >
          <ng-content select="[ideSidebar]" />
        </aside>

        <main class="ide-layout__main">
          <div class="ide-layout__editor">
            <ng-content select="[ideEditor]" />
          </div>

          @if (!bottomPanelCollapsed()) {
            <div
              class="ide-layout__bottom"
              [style.height.px]="bottomPanelHeight()"
            >
              <ng-content select="[ideBottomPanel]" />
            </div>
          }
        </main>
      </div>

      <footer class="ide-layout__statusbar">
        <ng-content select="[ideStatusBar]" />
      </footer>
    </div>
  `,
  styleUrl: './ide-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeLayoutComponent {
  readonly sidebarWidth = input<number>(260);
  readonly sidebarCollapsedWidth = input<number>(48);
  readonly sidebarCollapsed = input<boolean>(false);
  readonly bottomPanelHeight = input<number>(220);
  readonly bottomPanelCollapsed = input<boolean>(false);
}
