export interface AttributeObserverCallbacks {
  onValueChange: (value: string) => void;
}

export class AttributeObserver {
  private mutationObserver: MutationObserver | null = null;
  private pollingInterval: number | null = null;
  private lastKnownValue: string = '';
  private readonly hostElement: HTMLElement;
  private readonly callbacks: AttributeObserverCallbacks;

  constructor(hostElement: HTMLElement, callbacks: AttributeObserverCallbacks) {
    this.hostElement = hostElement;
    this.callbacks = callbacks;
  }

  start(): void {
    this.setupMutationObserver();
    this.setupPolling();
  }

  stop(): void {
    this.mutationObserver?.disconnect();
    if (this.pollingInterval !== null) {
      window.clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private setupMutationObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
          const newValue = this.hostElement.getAttribute('value') || '';
          this.callbacks.onValueChange(newValue);
        }
      }
    });

    this.mutationObserver.observe(this.hostElement, {
      attributes: true,
      attributeFilter: ['value']
    });
  }

  private setupPolling(): void {
    this.lastKnownValue = this.hostElement.getAttribute('value') || '';
    this.pollingInterval = window.setInterval(() => {
      const currentValue = this.hostElement.getAttribute('value') || '';
      if (currentValue !== this.lastKnownValue) {
        this.lastKnownValue = currentValue;
        this.callbacks.onValueChange(currentValue);
      }
    }, 50);
  }

  stopPolling(): void {
    if (this.pollingInterval !== null) {
      window.clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}
