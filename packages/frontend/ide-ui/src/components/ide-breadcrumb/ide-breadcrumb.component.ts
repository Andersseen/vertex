import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { createBreadcrumb } from '@andersseen/headless-components/breadcrumb';
import type { BreadcrumbItemConfig } from '@andersseen/headless-components/breadcrumb';

export type { BreadcrumbItemConfig as IdeBreadcrumbItem };

@Component({
  selector: 'v-ide-breadcrumb',
  standalone: true,
  template: `
    <nav
      class="ide-breadcrumb"
      [attr.aria-label]="bc.getNavProps()['aria-label']"
      [attr.role]="bc.getNavProps().role"
    >
      <ol class="ide-breadcrumb__list" [attr.role]="bc.getListProps().role">
        @for (item of items(); track item.id; let last = $last) {
          <li
            class="ide-breadcrumb__item"
            [class.ide-breadcrumb__item--current]="item.current"
            [attr.aria-current]="bc.getItemProps(item)['aria-current'] || null"
          >
            @if (item.current || !item.href) {
              <span class="ide-breadcrumb__segment ide-breadcrumb__segment--current">
                {{ item.label }}
              </span>
            } @else {
              <a
                class="ide-breadcrumb__segment ide-breadcrumb__segment--link"
                [href]="item.href"
                [attr.tabindex]="bc.getLinkProps(item).tabindex"
                (click)="onNavigate($event, item)"
                (keydown)="bc.handleKeyDown($event, item)"
              >
                {{ item.label }}
              </a>
            }
            @if (!last) {
              <span class="ide-breadcrumb__sep" aria-hidden="true">/</span>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styleUrl: './ide-breadcrumb.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeBreadcrumbComponent {
  readonly items = input<BreadcrumbItemConfig[]>([]);
  readonly ariaLabel = input<string>('Breadcrumb');
  readonly navigate = output<BreadcrumbItemConfig>();

  protected readonly bc = createBreadcrumb({
    items: this.items(),
    ariaLabel: this.ariaLabel(),
    onNavigate: (item) => this.navigate.emit(item as BreadcrumbItemConfig),
  });

  protected onNavigate(e: MouseEvent, item: BreadcrumbItemConfig): void {
    e.preventDefault();
    this.navigate.emit(item);
  }
}
