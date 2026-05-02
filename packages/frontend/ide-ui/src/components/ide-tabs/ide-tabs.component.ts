import {
  Component,
  input,
  output,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { createTabs } from '@andersseen/headless-components/tabs';

export interface IdeTabDef {
  id: string;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'v-ide-tabs',
  standalone: true,
  template: `
    <div class="ide-tabs" [class.ide-tabs--vertical]="orientation() === 'vertical'">
      <div
        class="ide-tabs__list"
        role="tablist"
        [attr.aria-orientation]="tabs.getTabListProps()['aria-orientation']"
      >
        @for (tab of tabDefs(); track tab.id) {
          <button
            class="ide-tabs__trigger"
            [class.ide-tabs__trigger--active]="tabs.queries.isSelected(tab.id)"
            [class.ide-tabs__trigger--disabled]="tab.disabled"
            [id]="tabs.getTabTriggerProps(tab.id).id"
            [attr.role]="tabs.getTabTriggerProps(tab.id).role"
            [attr.aria-selected]="tabs.getTabTriggerProps(tab.id)['aria-selected']"
            [attr.aria-controls]="tabs.getTabTriggerProps(tab.id)['aria-controls']"
            [attr.aria-disabled]="tabs.getTabTriggerProps(tab.id)['aria-disabled']"
            [attr.tabindex]="tabs.getTabTriggerProps(tab.id).tabindex"
            [attr.data-state]="tabs.queries.isSelected(tab.id) ? 'active' : 'inactive'"
            (click)="!tab.disabled && tabs.actions.selectTab(tab.id)"
            (keydown)="tabs.handleTabKeyDown($event, tab.id, tabIds())"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      <div
        class="ide-tabs__content"
        [id]="tabs.getTabContentProps(selectedTab()).id"
        [attr.role]="tabs.getTabContentProps(selectedTab()).role"
        [attr.aria-labelledby]="tabs.getTabContentProps(selectedTab())['aria-labelledby']"
        [attr.tabindex]="tabs.getTabContentProps(selectedTab()).tabindex"
        [hidden]="false"
      >
        <ng-content />
      </div>
    </div>
  `,
  styleUrl: './ide-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeTabsComponent {
  readonly tabsData = input<IdeTabDef[]>([]);
  readonly defaultValue = input<string>('');
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  readonly valueChange = output<string>();

  protected tabDefs = this.tabsData;
  protected selectedTab = () => this.tabs.state.selectedTab ?? this.defaultValue() ?? '';

  protected tabs = createTabs({
    defaultValue: this.defaultValue(),
    orientation: this.orientation(),
    onValueChange: (v) => this.valueChange.emit(v as string),
  });

  protected tabIds = () => this.tabDefs().map((t) => t.id);

  constructor() {
    // createTabs reads defaultValue() at field-init time (before inputs are set).
    // This effect re-runs once Angular resolves the input and syncs the selection.
    effect(() => {
      const val = this.defaultValue();
      if (val) this.tabs.actions.selectTab(val);
    });
  }
}
