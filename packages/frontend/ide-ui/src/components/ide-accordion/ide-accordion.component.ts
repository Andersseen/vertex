import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { createAccordion } from '@andersseen/headless-components/accordion';
import { IDE_ACCORDION_CTX, type IdeAccordionContext } from './ide-accordion.context';

@Component({
  selector: 'v-ide-accordion',
  standalone: true,
  template: `<div class="ide-accordion"><ng-content /></div>`,
  styleUrl: './ide-accordion.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: IDE_ACCORDION_CTX, useExisting: IdeAccordionComponent }],
})
export class IdeAccordionComponent implements IdeAccordionContext {
  readonly allowMultiple = input<boolean>(false);
  readonly defaultValue = input<string[]>([]);
  readonly valueChange = output<string[]>();

  readonly stateVersion = signal(0);

  private readonly accordion = createAccordion({
    allowMultiple: this.allowMultiple(),
    defaultValue: this.defaultValue(),
    onValueChange: (v) => this.valueChange.emit(v as string[]),
  });

  isOpen(id: string): boolean {
    return this.accordion.queries.isExpanded(id);
  }

  toggle(id: string): void {
    this.accordion.actions.toggle(id);
    this.stateVersion.update((v) => v + 1);
  }
}
