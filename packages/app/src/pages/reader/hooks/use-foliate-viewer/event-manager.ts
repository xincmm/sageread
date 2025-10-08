export interface EventHandlers {
  onLoad?: (event: CustomEvent) => void;
  onRelocate?: (event: CustomEvent) => void;
  onRendererRelocate?: (event: CustomEvent) => void;
  onResize?: (event: CustomEvent) => void;
}

export class EventManager {
  private eventListeners: Map<string, EventListener[]> = new Map();
  private windowListeners: Array<{ event: string; handler: EventListener }> = [];
  private documentListeners: Array<{ event: string; handler: EventListener }> = [];

  constructor(private target?: EventTarget) {}

  addEventListener(event: string, handler: EventListener, options?: AddEventListenerOptions): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);

    if (this.target) {
      this.target.addEventListener(event, handler, options);
    }
  }

  addWindowListener(event: string, handler: EventListener, options?: AddEventListenerOptions): void {
    this.windowListeners.push({ event, handler });
    window.addEventListener(event, handler, options);
  }

  addDocumentListener(event: string, handler: EventListener, options?: AddEventListenerOptions): void {
    this.documentListeners.push({ event, handler });
    document.addEventListener(event, handler, options);
  }

  setupFoliateEventHandlers(handlers: EventHandlers): void {
    if (handlers.onLoad) {
      this.addEventListener("load", (event: Event) => {
        handlers.onLoad!(event as CustomEvent);
      });
    }
    if (handlers.onRelocate) {
      this.addEventListener("relocate", (event: Event) => {
        handlers.onRelocate!(event as CustomEvent);
      });
    }
    if (handlers.onRendererRelocate) {
      this.addEventListener("renderer-relocate", (event: Event) => {
        handlers.onRendererRelocate!(event as CustomEvent);
      });
    }
  }

  setupGlobalEventListeners(
    bookId: string,
    handlers: {
      onResize?: (bookIds: string[]) => void;
      onMessage?: (event: MessageEvent) => void;
    },
  ): void {
    if (handlers.onResize) {
      this.addWindowListener("foliate-resize-update", (event: Event) => {
        const { bookIds } = (event as CustomEvent).detail;
        if (bookIds?.includes(bookId)) {
          handlers.onResize!(bookIds);
        }
      });
    }

    if (handlers.onMessage) {
      this.addWindowListener("message", (event: Event) => {
        handlers.onMessage!(event as MessageEvent);
      });
    }
  }

  removeAllEventListeners(): void {
    // Remove target listeners
    if (this.target) {
      this.eventListeners.forEach((listeners, event) => {
        listeners.forEach((handler) => {
          this.target!.removeEventListener(event, handler);
        });
      });
    }

    // Remove window listeners
    this.windowListeners.forEach(({ event, handler }) => {
      window.removeEventListener(event, handler);
    });

    // Remove document listeners
    this.documentListeners.forEach(({ event, handler }) => {
      document.removeEventListener(event, handler);
    });

    // Clear all listener maps
    this.eventListeners.clear();
    this.windowListeners = [];
    this.documentListeners = [];
  }

  destroy(): void {
    this.removeAllEventListeners();
  }
}
