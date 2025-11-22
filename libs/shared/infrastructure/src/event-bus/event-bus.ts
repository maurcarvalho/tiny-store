import { DomainEvent } from './domain-event.interface';

type EventHandler = (event: DomainEvent) => Promise<void> | void;

class EventBus {
  private subscribers: Map<string, Set<EventHandler>> = new Map();
  private static instance: EventBus;

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(handler);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.subscribers.get(event.eventType);
    
    if (!handlers || handlers.size === 0) {
      console.log(`No subscribers for event type: ${event.eventType}`);
      return;
    }

    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        console.error(
          `Error handling event ${event.eventType} (${event.eventId}):`,
          error
        );
      }
    });

    await Promise.all(promises);
  }

  clear(): void {
    this.subscribers.clear();
  }
}

export { EventBus };

