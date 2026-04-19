import { Injectable, signal, computed } from '@angular/core';
import { SplitterOrientation, SplitterConfig, DEFAULT_SPLITTER_CONFIG } from './splitter.types';

@Injectable()
export class SplitterService {
  private config = signal<SplitterConfig>(DEFAULT_SPLITTER_CONFIG);

  #position = signal<number>(DEFAULT_SPLITTER_CONFIG.defaultPosition);
  #orientation = signal<SplitterOrientation>('horizontal');
  #isDragging = signal<boolean>(false);
  #containerRect = signal<DOMRect | null>(null);

  readonly position = this.#position.asReadonly();
  readonly orientation = this.#orientation.asReadonly();
  readonly isDragging = this.#isDragging.asReadonly();
  readonly containerRect = this.#containerRect.asReadonly();

  readonly isHorizontal = computed(() => this.#orientation() === 'horizontal');
  readonly isVertical = computed(() => this.#orientation() === 'vertical');
  readonly minSize = computed(() => this.config().minSize);
  readonly maxSize = computed(() => this.config().maxSize);
  readonly step = computed(() => this.config().step);

  updateConfig(config: Partial<SplitterConfig>): void {
    this.config.update((current) => ({ ...current, ...config }));
  }

  setOrientation(orientation: SplitterOrientation): void {
    this.#orientation.set(orientation);
  }

  setContainerRect(rect: DOMRect): void {
    this.#containerRect.set(rect);
  }

  setPosition(position: number): void {
    const cfg = this.config();
    const clamped = Math.max(cfg.minSize, Math.min(cfg.maxSize, position));
    const stepped = Math.round(clamped / cfg.step) * cfg.step;
    this.#position.set(stepped);
  }

  startDragging(): void {
    this.#isDragging.set(true);
  }

  stopDragging(): void {
    this.#isDragging.set(false);
  }

  calculatePositionFromEvent(clientX: number, clientY: number): number {
    const rect = this.#containerRect();
    if (!rect) return this.#position();

    if (this.isHorizontal()) {
      return ((clientX - rect.left) / rect.width) * 100;
    } else {
      return ((clientY - rect.top) / rect.height) * 100;
    }
  }

  calculatePositionFromTouch(touch: Touch): number {
    return this.calculatePositionFromEvent(touch.clientX, touch.clientY);
  }
}
