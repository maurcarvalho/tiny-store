/**
 * Event Flow Integration Tests
 *
 * Tests the EventBus pub/sub mechanism and event propagation
 * patterns used in the modular monolith architecture.
 */
import 'reflect-metadata';
import { EventBus, DomainEvent } from '@tiny-store/shared-infrastructure';
import { v4 as uuid } from 'uuid';

function createEvent(eventType: string, payload: Record<string, any> = {}): DomainEvent {
  return {
    eventId: uuid(),
    eventType,
    aggregateId: payload.orderId || uuid(),
    aggregateType: 'Order',
    occurredAt: new Date(),
    payload,
    version: 1,
  };
}

let emittedEvents: { name: string; payload: any }[] = [];

function trackEvents(eventBus: EventBus): void {
  const allEvents = [
    'OrderPlaced', 'OrderConfirmed', 'OrderRejected',
    'OrderPaid', 'OrderPaymentFailed', 'OrderShipped', 'OrderCancelled',
    'InventoryReserved', 'InventoryReservationFailed', 'InventoryReleased',
    'PaymentProcessed', 'PaymentFailed', 'ShipmentCreated',
  ];
  for (const eventName of allEvents) {
    eventBus.subscribe(eventName, (event: DomainEvent) => {
      emittedEvents.push({ name: eventName, payload: event.payload });
    });
  }
}

describe('Event Flow Integration', () => {
  beforeEach(() => {
    emittedEvents = [];
    (EventBus as any).instance = null;
  });

  afterEach(() => {
    (EventBus as any).instance = null;
  });

  describe('EventBus pub/sub', () => {
    it('should deliver events to all subscribers', async () => {
      const eventBus = EventBus.getInstance();
      const received: string[] = [];

      eventBus.subscribe('TestEvent', (_e: DomainEvent) => { received.push('handler1'); });
      eventBus.subscribe('TestEvent', (_e: DomainEvent) => { received.push('handler2'); });

      await eventBus.publish(createEvent('TestEvent'));

      expect(received).toEqual(['handler1', 'handler2']);
    });

    it('should not deliver events to unrelated subscribers', async () => {
      const eventBus = EventBus.getInstance();
      const received: string[] = [];

      eventBus.subscribe('EventA', (_e: DomainEvent) => { received.push('A'); });
      eventBus.subscribe('EventB', (_e: DomainEvent) => { received.push('B'); });

      await eventBus.publish(createEvent('EventA'));

      expect(received).toEqual(['A']);
    });

    it('should handle async subscribers', async () => {
      const eventBus = EventBus.getInstance();
      const received: string[] = [];

      eventBus.subscribe('AsyncEvent', async (_e: DomainEvent) => {
        await new Promise((r) => setTimeout(r, 10));
        received.push('async-done');
      });

      await eventBus.publish(createEvent('AsyncEvent'));
      await new Promise((r) => setTimeout(r, 50));

      expect(received).toEqual(['async-done']);
    });

    it('should maintain singleton across calls', () => {
      const bus1 = EventBus.getInstance();
      const bus2 = EventBus.getInstance();
      expect(bus1).toBe(bus2);
    });
  });

  describe('Event cascading', () => {
    it('should allow modules to react to each other\'s events', async () => {
      const eventBus = EventBus.getInstance();
      const reactions: string[] = [];

      // Simulate inventory reacting to OrderPlaced by publishing InventoryReserved
      eventBus.subscribe('OrderPlaced', (event: DomainEvent) => {
        reactions.push('inventory:order-placed');
        eventBus.publish(createEvent('InventoryReserved', {
          orderId: event.payload.orderId,
        }));
      });

      // Simulate orders reacting to InventoryReserved
      eventBus.subscribe('InventoryReserved', (_e: DomainEvent) => {
        reactions.push('orders:inventory-reserved');
      });

      await eventBus.publish(createEvent('OrderPlaced', { orderId: 'order-1' }));
      await new Promise((r) => setTimeout(r, 100));

      expect(reactions).toContain('inventory:order-placed');
      expect(reactions).toContain('orders:inventory-reserved');
    });

    it('should propagate events through a multi-step chain', async () => {
      const eventBus = EventBus.getInstance();
      trackEvents(eventBus);

      // Wire a simplified happy path chain
      eventBus.subscribe('OrderPlaced', () => {
        eventBus.publish(createEvent('InventoryReserved', { orderId: 'chain-1' }));
      });
      eventBus.subscribe('InventoryReserved', () => {
        eventBus.publish(createEvent('OrderConfirmed', { orderId: 'chain-1' }));
      });
      eventBus.subscribe('OrderConfirmed', () => {
        eventBus.publish(createEvent('PaymentProcessed', { orderId: 'chain-1' }));
      });

      await eventBus.publish(createEvent('OrderPlaced', { orderId: 'chain-1' }));
      await new Promise((r) => setTimeout(r, 200));

      const eventNames = emittedEvents.map((e) => e.name);
      expect(eventNames).toContain('OrderPlaced');
      expect(eventNames).toContain('InventoryReserved');
      expect(eventNames).toContain('OrderConfirmed');
      expect(eventNames).toContain('PaymentProcessed');
    });
  });

  describe('Event isolation', () => {
    it('should not leak events between separate EventBus instances', () => {
      // After singleton reset, new instance has no subscribers
      const bus1 = EventBus.getInstance();
      const received: string[] = [];
      bus1.subscribe('TestEvent', () => { received.push('bus1'); });

      // Reset singleton
      (EventBus as any).instance = null;
      const bus2 = EventBus.getInstance();

      // bus2 should have no subscribers
      bus2.publish(createEvent('TestEvent'));
      expect(received).toEqual([]); // bus1 handler not on bus2
    });
  });
});
