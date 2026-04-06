export interface AttributeObserverCallbacks {
  onValueChange: (value: string) => void;
  onThemeChange?: (theme: string) => void;
}

/**
 * Attribute Observer - Lite version
 * 
 * Simplified for read-only code display.
 * Uses only MutationObserver, no polling needed.
 */
export class AttributeObserver {
  private mutationObserver: MutationObserver | null = null;
  private readonly hostElement: HTMLElement;
  private readonly callbacks: AttributeObserverCallbacks;

  constructor(hostElement: HTMLElement, callbacks: AttributeObserverCallbacks) {
    this.hostElement = hostElement;
    this.callbacks = callbacks;
  }

  start(): void {
    this.setupMutationObserver();
  }

  stop(): void {
    this.mutationObserver?.disconnect();
  }

  /**
   * @deprecated No longer needed in lite version
   * Kept for API compatibility
   */
  stopPolling(): void {
    // No-op in lite version
  }

  private setupMutationObserver(): void {
    const attributeFilter = ['value'];
    if (this.callbacks.onThemeChange) attributeFilter.push('theme');

    this.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== 'attributes') continue;
        if (mutation.attributeName === 'value') {
          const newValue = this.hostElement.getAttribute('value') || '';
          this.callbacks.onValueChange(newValue);
        } else if (mutation.attributeName === 'theme' && this.callbacks.onThemeChange) {
          const newTheme = this.hostElement.getAttribute('theme') || 'dark';
          this.callbacks.onThemeChange(newTheme);
        }
      }
    });

    this.mutationObserver.observe(this.hostElement, {
      attributes: true,
      attributeFilter,
    });
  }
}

/**
 * CHANGES from full version:
 * - Removed polling mechanism (not needed for display)
 * - Simplified to MutationObserver only
 * - Reduced memory footprint
 */
