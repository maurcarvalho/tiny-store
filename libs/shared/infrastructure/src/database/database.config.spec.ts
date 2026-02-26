import { createDatabaseConnection, closeDatabaseConnection } from './database.config';
import type { DrizzleDb } from './database.config';
import { productsTable, stockReservationsTable } from '@tiny-store/modules-inventory/internal';
import { ordersTable } from '@tiny-store/modules-orders/internal';
import { paymentsTable } from '@tiny-store/modules-payments/internal';
import { shipmentsTable } from '@tiny-store/modules-shipments/internal';
import { eventStoreTable } from '../event-store/schema';

describe('Database Configuration - Drizzle Schema', () => {
  let db: DrizzleDb;

  beforeAll(async () => {
    db = await createDatabaseConnection();
  });

  afterAll(async () => {
    await closeDatabaseConnection();
  });

  describe('Drizzle Table Definitions', () => {
    it('should define productsTable with correct columns', () => {
      const columns = Object.keys(productsTable);
      expect(columns).toContain('id');
      expect(columns).toContain('sku');
      expect(columns).toContain('name');
      expect(columns).toContain('stockQuantity');
      expect(columns).toContain('reservedQuantity');
      expect(columns).toContain('status');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });

    it('should define stockReservationsTable with correct columns', () => {
      const columns = Object.keys(stockReservationsTable);
      expect(columns).toContain('id');
      expect(columns).toContain('orderId');
      expect(columns).toContain('sku');
      expect(columns).toContain('quantity');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('expiresAt');
      expect(columns).toContain('released');
    });

    it('should define ordersTable with correct columns', () => {
      const columns = Object.keys(ordersTable);
      expect(columns).toContain('id');
      expect(columns).toContain('customerId');
      expect(columns).toContain('items');
      expect(columns).toContain('totalAmount');
      expect(columns).toContain('shippingAddress');
      expect(columns).toContain('status');
      expect(columns).toContain('paymentId');
      expect(columns).toContain('shipmentId');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });

    it('should define paymentsTable with correct columns', () => {
      const columns = Object.keys(paymentsTable);
      expect(columns).toContain('id');
      expect(columns).toContain('orderId');
      expect(columns).toContain('amount');
      expect(columns).toContain('status');
      expect(columns).toContain('paymentMethod');
      expect(columns).toContain('failureReason');
      expect(columns).toContain('processingAttempts');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });

    it('should define shipmentsTable with correct columns', () => {
      const columns = Object.keys(shipmentsTable);
      expect(columns).toContain('id');
      expect(columns).toContain('orderId');
      expect(columns).toContain('trackingNumber');
      expect(columns).toContain('shippingAddress');
      expect(columns).toContain('status');
      expect(columns).toContain('dispatchedAt');
      expect(columns).toContain('deliveredAt');
      expect(columns).toContain('estimatedDeliveryDate');
      expect(columns).toContain('createdAt');
      expect(columns).toContain('updatedAt');
    });

    it('should define eventStoreTable with correct columns', () => {
      const columns = Object.keys(eventStoreTable);
      expect(columns).toContain('eventId');
      expect(columns).toContain('eventType');
      expect(columns).toContain('aggregateId');
      expect(columns).toContain('aggregateType');
      expect(columns).toContain('occurredAt');
      expect(columns).toContain('payload');
      expect(columns).toContain('version');
    });

    it('should have exactly 6 table definitions across modules', () => {
      const tables = [
        productsTable,
        stockReservationsTable,
        ordersTable,
        paymentsTable,
        shipmentsTable,
        eventStoreTable,
      ];
      expect(tables).toHaveLength(6);
      tables.forEach((table) => expect(table).toBeDefined());
    });
  });

  describe('Database Connection', () => {
    it('should create a valid drizzle database instance', () => {
      expect(db).toBeDefined();
      expect(typeof db.select).toBe('function');
      expect(typeof db.insert).toBe('function');
      expect(typeof db.update).toBe('function');
      expect(typeof db.delete).toBe('function');
    });
  });
});
