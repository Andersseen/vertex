import { InjectionToken, Signal } from '@angular/core';

export interface IdeAccordionContext {
  /** Increments on every state change so item effects can react reactively. */
  stateVersion: Signal<number>;
  isOpen(id: string): boolean;
  toggle(id: string): void;
}

export const IDE_ACCORDION_CTX = new InjectionToken<IdeAccordionContext>('IDE_ACCORDION_CTX');
