/**
 * Module Registry & Extraction Tests
 *
 * Validates that the MODULE_REGISTRY pattern correctly:
 *   - Registers all module listeners when no extraction is configured
 *   - Skips extracted module listeners based on EXTRACTED_MODULES env
 *   - Always registers event store subscriptions regardless of extraction
 *   - Supports extracting multiple modules simultaneously
 *
 * Uses jest.isolateModules() to ensure each test gets a fresh module
 * evaluation so that EXTRACTED_MODULES is read from process.env each time.
 */
import 'reflect-metadata';

// Events owned by each module (as listeners, not emitters)
const INVENTORY_EVENTS = ['OrderPlaced', 'OrderCancelled', 'OrderPaymentFailed'];
const ORDERS_EVENTS = [
  'InventoryReserved',
  'InventoryReservationFailed',
  'PaymentProcessed',
  'PaymentFailed',
  'ShipmentCreated',
];
const PAYMENTS_EVENTS = ['OrderConfirmed'];
const SHIPMENTS_EVENTS = ['OrderPaid'];

const EVENT_STORE_EVENTS = [
  'OrderPlaced', 'OrderConfirmed', 'OrderRejected',
  'OrderPaid', 'OrderPaymentFailed', 'OrderShipped', 'OrderCancelled',
  'InventoryReserved', 'InventoryReservationFailed', 'InventoryReleased',
  'PaymentProcessed', 'PaymentFailed', 'ShipmentCreated',
];

function fakeDataSource(): any {
  const fakeRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockReturnValue({}),
  };
  return {
    getRepository: () => fakeRepo,
    manager: {
      transaction: jest.fn().mockImplementation((cb: any) =>
        cb({ getRepository: () => fakeRepo })
      ),
    },
    createQueryRunner: () => ({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: { getRepository: () => fakeRepo },
    }),
  };
}

/**
 * Runs registerListeners inside jest.isolateModules so that
 * EXTRACTED_MODULES is freshly evaluated from process.env.
 * Returns the list of event names that were subscribed.
 */
function runWithExtraction(extractedModules?: string): string[] {
  if (extractedModules !== undefined) {
    process.env['EXTRACTED_MODULES'] = extractedModules;
  } else {
    delete process.env['EXTRACTED_MODULES'];
  }

  const subscriptions: string[] = [];

  jest.isolateModules(() => {
    // Fresh import of EventBus — spy on subscribe before registerListeners runs
    const infra = require('@tiny-store/shared-infrastructure');
    (infra.EventBus as any).instance = null;

    const origSubscribe = infra.EventBus.prototype.subscribe;
    infra.EventBus.prototype.subscribe = function (event: string, _handler: Function) {
      subscriptions.push(event);
    };

    // Fresh import of registerListeners — re-evaluates EXTRACTED_MODULES
    const { registerListeners } = require('../../apps/api/src/app/lib/register-listeners');
    registerListeners(fakeDataSource());

    // Restore
    infra.EventBus.prototype.subscribe = origSubscribe;
    (infra.EventBus as any).instance = null;
  });

  delete process.env['EXTRACTED_MODULES'];
  return subscriptions;
}

describe('Module Registry', () => {
  afterEach(() => {
    delete process.env['EXTRACTED_MODULES'];
  });

  describe('with no extraction (monolith mode)', () => {
    it('should register listeners for all four modules', () => {
      const events = runWithExtraction();

      for (const event of EVENT_STORE_EVENTS) {
        expect(events).toContain(event);
      }

      for (const event of [...INVENTORY_EVENTS, ...ORDERS_EVENTS, ...PAYMENTS_EVENTS, ...SHIPMENTS_EVENTS]) {
        const count = events.filter((e) => e === event).length;
        expect(count).toBeGreaterThanOrEqual(2);
      }
    });

    it('should register more subscriptions than just event store', () => {
      const events = runWithExtraction();
      expect(events.length).toBeGreaterThan(EVENT_STORE_EVENTS.length);
    });
  });

  describe('with orders extracted', () => {
    it('should skip orders listeners but keep others', () => {
      const events = runWithExtraction('orders');

      // Event store still captures everything
      for (const event of EVENT_STORE_EVENTS) {
        expect(events).toContain(event);
      }

      // Inventory still active
      for (const event of INVENTORY_EVENTS) {
        expect(events.filter((e) => e === event).length).toBeGreaterThanOrEqual(2);
      }

      // Orders listener events: only event store (count = 1)
      for (const event of ORDERS_EVENTS) {
        const count = events.filter((e) => e === event).length;
        expect(count).toBe(1);
      }

      // Payments and Shipments still active
      for (const event of PAYMENTS_EVENTS) {
        expect(events.filter((e) => e === event).length).toBeGreaterThanOrEqual(2);
      }
      for (const event of SHIPMENTS_EVENTS) {
        expect(events.filter((e) => e === event).length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('with multiple modules extracted', () => {
    it('should skip both orders and payments listeners', () => {
      const events = runWithExtraction('orders,payments');

      for (const event of ORDERS_EVENTS) {
        expect(events.filter((e) => e === event).length).toBe(1);
      }
      for (const event of PAYMENTS_EVENTS) {
        expect(events.filter((e) => e === event).length).toBe(1);
      }

      // Inventory and Shipments still active
      for (const event of INVENTORY_EVENTS) {
        expect(events.filter((e) => e === event).length).toBeGreaterThanOrEqual(2);
      }
      for (const event of SHIPMENTS_EVENTS) {
        expect(events.filter((e) => e === event).length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('with all modules extracted', () => {
    it('should only have event store subscriptions', () => {
      const events = runWithExtraction('inventory,orders,payments,shipments');

      expect(events.length).toBe(EVENT_STORE_EVENTS.length);
      for (const event of EVENT_STORE_EVENTS) {
        expect(events.filter((e) => e === event).length).toBe(1);
      }
    });
  });

  describe('EXTRACTED_MODULES parsing', () => {
    it('should handle whitespace in module names', () => {
      const events = runWithExtraction(' orders , payments ');

      for (const event of ORDERS_EVENTS) {
        expect(events.filter((e) => e === event).length).toBe(1);
      }
      for (const event of PAYMENTS_EVENTS) {
        expect(events.filter((e) => e === event).length).toBe(1);
      }
    });

    it('should handle empty string gracefully', () => {
      const events = runWithExtraction('');
      expect(events.length).toBeGreaterThan(EVENT_STORE_EVENTS.length);
    });

    it('should be case-insensitive', () => {
      const events = runWithExtraction('Orders,PAYMENTS');

      for (const event of ORDERS_EVENTS) {
        expect(events.filter((e) => e === event).length).toBe(1);
      }
      for (const event of PAYMENTS_EVENTS) {
        expect(events.filter((e) => e === event).length).toBe(1);
      }
    });

    it('should ignore unknown module names', () => {
      const events = runWithExtraction('nonexistent');
      expect(events.length).toBeGreaterThan(EVENT_STORE_EVENTS.length);
    });
  });
});
