import type { ElementRef, Renderer2 } from '@angular/core';

export interface IdeMenuItemBase {
  id: string;
  disabled?: boolean;
  intent?: 'default' | 'destructive';
  separator?: boolean;
}

export interface IdeHeadlessMenuItem {
  id: string;
  disabled?: boolean;
  intent?: 'default' | 'destructive';
}

export function toHeadlessMenuItem(item: IdeMenuItemBase): IdeHeadlessMenuItem {
  return {
    id: item.id,
    disabled: item.disabled,
    intent: item.intent,
  };
}

export function getInteractiveMenuItems<T extends IdeMenuItemBase>(items: readonly T[]): IdeHeadlessMenuItem[] {
  return items.filter((item) => !item.separator).map((item) => toHeadlessMenuItem(item));
}

export function getInteractiveMenuItemIds(items: readonly IdeMenuItemBase[]): string[] {
  return items.filter((item) => !item.separator).map((item) => item.id);
}

export function getMenuIndex(items: readonly IdeMenuItemBase[], templateIndex: number): number {
  const item = items[templateIndex];
  if (!item || item.separator) return -1;
  return items.slice(0, templateIndex + 1).filter((candidate) => !candidate.separator).length - 1;
}

export function focusFirstMenuItem(doc: Document, menuId: string): void {
  const focus = () => {
    const first = doc.querySelector<HTMLElement>(`#${menuId} [data-ide-menu-item]:not([data-disabled])`);
    first?.focus();
  };

  const win = doc.defaultView;
  if (win) {
    win.requestAnimationFrame(focus);
    return;
  }

  focus();
}

export function createPointAnchor(
  renderer: Renderer2,
  hostRef: ElementRef<HTMLElement>,
): HTMLElement {
  const anchor = renderer.createElement('span') as HTMLElement;
  renderer.setAttribute(anchor, 'aria-hidden', 'true');
  renderer.addClass(anchor, 'ide-overlay-point-anchor');
  renderer.appendChild(hostRef.nativeElement, anchor);
  return anchor;
}
