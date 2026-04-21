jest.mock('drizzle-orm', () => {
  const actual = jest.requireActual('drizzle-orm');
  return {
    ...actual,
    eq: (column: unknown, value: unknown) => ({ __mockOp: 'eq', column, value }),
  };
});

import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { StockReservationRepository } from './stock-reservation.repository';
import { stockReservationsTable } from '../../db/schema';

type Row = typeof stockReservationsTable.$inferSelect;

interface MockCondition {
  __mockOp: 'eq';
  column: unknown;
  value: unknown;
}

function columnKey(table: Record<string, unknown>, column: unknown): string {
  for (const [key, val] of Object.entries(table)) {
    if (val === column) return key;
  }
  throw new Error('Unknown column in mock db');
}

function createMockDb(): DrizzleDb {
  const store = new Map<string, Row>();

  const api = {
    __store: store,
    insert: (table: Record<string, unknown>) => ({
      values: (data: Row) => ({
        onConflictDoUpdate: ({ set }: { target: unknown; set: Partial<Row> }) => {
          const existing = store.get(data.id);
          if (existing) {
            store.set(data.id, { ...existing, ...set });
          } else {
            store.set(data.id, { ...data });
          }
          return Promise.resolve();
        },
      }),
    }),
    select: () => ({
      from: (table: Record<string, unknown>) => ({
        where: (cond: MockCondition) => {
          const key = columnKey(table, cond.column);
          const rows = Array.from(store.values()).filter(
            (r) => (r as Record<string, unknown>)[key] === cond.value
          );
          return Promise.resolve(rows);
        },
      }),
    }),
    update: (table: Record<string, unknown>) => ({
      set: (patch: Partial<Row>) => ({
        where: (cond: MockCondition) => {
          const key = columnKey(table, cond.column);
          for (const [id, row] of store.entries()) {
            if ((row as Record<string, unknown>)[key] === cond.value) {
              store.set(id, { ...row, ...patch });
            }
          }
          return Promise.resolve();
        },
      }),
    }),
    delete: (_table: Record<string, unknown>) => {
      store.clear();
      return Promise.resolve();
    },
  };

  return api as unknown as DrizzleDb;
}

describe('StockReservationRepository', () => {
  let db: DrizzleDb;
  let repository: StockReservationRepository;

  beforeEach(async () => {
    db = createMockDb();
    repository = new StockReservationRepository(db);
    await db.delete(stockReservationsTable);
  });

  describe('Create Reservation', () => {
    it('should persist stock reservation', async () => {
      const reservationId = await repository.create(
        'order-123',
        'SKU-001',
        10
      );

      expect(reservationId).toBeDefined();
      expect(typeof reservationId).toBe('string');

      const saved = await repository.findById(reservationId);
      expect(saved).toBeDefined();
      expect(saved!.orderId).toBe('order-123');
      expect(saved!.sku).toBe('SKU-001');
      expect(saved!.quantity).toBe(10);
      expect(saved!.released).toBe(false);
    });

    it('should create reservation with unique ID', async () => {
      const id1 = await repository.create('order-123', 'SKU-001', 5);
      const id2 = await repository.create('order-123', 'SKU-002', 3);

      expect(id1).not.toBe(id2);
    });

    it('should set createdAt timestamp', async () => {
      const before = new Date();
      const id = await repository.create('order-456', 'SKU-003', 7);
      const after = new Date();

      const saved = await repository.findById(id);
      expect(saved!.createdAt).toBeDefined();
      expect(saved!.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(saved!.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Find Operations', () => {
    it('should find reservation by ID', async () => {
      const id = await repository.create('order-789', 'SKU-004', 15);

      const found = await repository.findById(id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(id);
      expect(found!.orderId).toBe('order-789');
      expect(found!.sku).toBe('SKU-004');
      expect(found!.quantity).toBe(15);
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById('non-existent-id');

      expect(found).toBeNull();
    });

    it('should find all reservations by order ID', async () => {
      const orderId = 'order-multi';
      await repository.create(orderId, 'SKU-001', 5);
      await repository.create(orderId, 'SKU-002', 3);
      await repository.create(orderId, 'SKU-003', 7);
      await repository.create('other-order', 'SKU-004', 10);

      const reservations = await repository.findByOrderId(orderId);

      expect(reservations).toHaveLength(3);
      expect(reservations.every(r => r.orderId === orderId)).toBe(true);

      const skus = reservations.map(r => r.sku).sort();
      expect(skus).toEqual(['SKU-001', 'SKU-002', 'SKU-003']);
    });

    it('should find all reservations by SKU', async () => {
      const sku = 'SKU-POPULAR';
      await repository.create('order-1', sku, 10);
      await repository.create('order-2', sku, 15);
      await repository.create('order-3', sku, 5);
      await repository.create('order-4', 'OTHER-SKU', 20);

      const reservations = await repository.findBySku(sku);

      expect(reservations).toHaveLength(3);
      expect(reservations.every(r => r.sku === sku)).toBe(true);

      const quantities = reservations.map(r => r.quantity).sort((a, b) => a - b);
      expect(quantities).toEqual([5, 10, 15]);
    });

    it('should return empty array when no reservations found', async () => {
      const byOrder = await repository.findByOrderId('non-existent-order');
      const bySku = await repository.findBySku('non-existent-sku');

      expect(byOrder).toEqual([]);
      expect(bySku).toEqual([]);
    });
  });

  describe('Release Operations', () => {
    it('should release all reservations for an order', async () => {
      const orderId = 'order-to-release';
      const id1 = await repository.create(orderId, 'SKU-001', 5);
      const id2 = await repository.create(orderId, 'SKU-002', 10);

      await repository.releaseByOrderId(orderId);

      const reservation1 = await repository.findById(id1);
      const reservation2 = await repository.findById(id2);

      expect(reservation1!.released).toBe(true);
      expect(reservation2!.released).toBe(true);
    });

    it('should not affect other orders when releasing', async () => {
      const order1 = 'order-release-1';
      const order2 = 'order-keep-2';

      const id1 = await repository.create(order1, 'SKU-001', 5);
      const id2 = await repository.create(order2, 'SKU-002', 10);

      await repository.releaseByOrderId(order1);

      const released = await repository.findById(id1);
      const kept = await repository.findById(id2);

      expect(released!.released).toBe(true);
      expect(kept!.released).toBe(false);
    });

    it('should be idempotent (releasing twice has same effect)', async () => {
      const orderId = 'order-idempotent';
      const id = await repository.create(orderId, 'SKU-001', 5);

      await repository.releaseByOrderId(orderId);
      await repository.releaseByOrderId(orderId);

      const reservation = await repository.findById(id);
      expect(reservation!.released).toBe(true);
    });

    it('should handle releasing order with no reservations', async () => {
      // Should not throw error
      await expect(
        repository.releaseByOrderId('non-existent-order')
      ).resolves.not.toThrow();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple SKUs for same order', async () => {
      const orderId = 'order-complex-1';

      await repository.create(orderId, 'SKU-A', 10);
      await repository.create(orderId, 'SKU-B', 20);
      await repository.create(orderId, 'SKU-C', 30);

      const reservations = await repository.findByOrderId(orderId);

      expect(reservations).toHaveLength(3);

      const totalQuantity = reservations.reduce((sum, r) => sum + r.quantity, 0);
      expect(totalQuantity).toBe(60);
    });

    it('should track reservations for same SKU across orders', async () => {
      const sku = 'SKU-TRACKED';

      await repository.create('order-1', sku, 5);
      await repository.create('order-2', sku, 10);
      await repository.create('order-3', sku, 15);

      const reservations = await repository.findBySku(sku);

      expect(reservations).toHaveLength(3);

      const totalReserved = reservations.reduce((sum, r) => sum + r.quantity, 0);
      expect(totalReserved).toBe(30);
    });

    it('should correctly filter released vs active reservations', async () => {
      const sku = 'SKU-FILTER';

      await repository.create('order-1', sku, 5);
      await repository.create('order-2', sku, 10);
      await repository.create('order-3', sku, 15);

      await repository.releaseByOrderId('order-1');
      await repository.releaseByOrderId('order-3');

      const allReservations = await repository.findBySku(sku);
      const activeReservations = allReservations.filter(r => !r.released);
      const releasedReservations = allReservations.filter(r => r.released);

      expect(activeReservations).toHaveLength(1);
      expect(activeReservations[0].quantity).toBe(10);

      expect(releasedReservations).toHaveLength(2);
      const releasedQuantities = releasedReservations.map(r => r.quantity).sort((a, b) => a - b);
      expect(releasedQuantities).toEqual([5, 15]);
    });
  });
});
