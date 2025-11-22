import { DataSource } from 'typeorm';
import { createDatabaseConnection } from './database.config';
import { ProductEntity } from '@tiny-store/modules-inventory';
import { StockReservationEntity } from '@tiny-store/modules-inventory';
import { OrderEntity } from '@tiny-store/modules-orders';
import { PaymentEntity } from '@tiny-store/modules-payments';
import { ShipmentEntity } from '@tiny-store/modules-shipments';
import { EventStoreEntity } from '../event-store/event-store.entity';

describe('Database Configuration - Entity Registration', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await createDatabaseConnection();
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('Critical Entity Registration', () => {
    it('should register ProductEntity', () => {
      const metadata = dataSource.getMetadata(ProductEntity);
      expect(metadata).toBeDefined();
      expect(metadata.tableName).toBe('products');
    });

    it('should register StockReservationEntity', () => {
      const metadata = dataSource.getMetadata(StockReservationEntity);
      expect(metadata).toBeDefined();
      expect(metadata.tableName).toBe('stock_reservations');
    });

    it('should register OrderEntity', () => {
      const metadata = dataSource.getMetadata(OrderEntity);
      expect(metadata).toBeDefined();
      expect(metadata.tableName).toBe('orders');
    });

    it('should register PaymentEntity', () => {
      const metadata = dataSource.getMetadata(PaymentEntity);
      expect(metadata).toBeDefined();
      expect(metadata.tableName).toBe('payments');
    });

    it('should register ShipmentEntity', () => {
      const metadata = dataSource.getMetadata(ShipmentEntity);
      expect(metadata).toBeDefined();
      expect(metadata.tableName).toBe('shipments');
    });

    it('should register EventStoreEntity', () => {
      const metadata = dataSource.getMetadata(EventStoreEntity);
      expect(metadata).toBeDefined();
      expect(metadata.tableName).toBe('event_store');
    });

    it('should have exactly 6 entities registered', () => {
      const entities = dataSource.entityMetadatas;
      expect(entities.length).toBe(6);
      
      const tableNames = entities.map(e => e.tableName).sort();
      expect(tableNames).toEqual([
        'event_store',
        'orders',
        'payments',
        'products',
        'shipments',
        'stock_reservations',
      ]);
    });
  });

  describe('StockReservationEntity Schema Validation', () => {
    it('should have all required columns', () => {
      const metadata = dataSource.getMetadata(StockReservationEntity);
      const columnNames = metadata.columns.map(c => c.propertyName).sort();
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('orderId');
      expect(columnNames).toContain('sku');
      expect(columnNames).toContain('quantity');
      expect(columnNames).toContain('createdAt');
      expect(columnNames).toContain('expiresAt');
      expect(columnNames).toContain('released');
    });

    it('should have correct column types', () => {
      const metadata = dataSource.getMetadata(StockReservationEntity);
      
      const idColumn = metadata.columns.find(c => c.propertyName === 'id');
      expect(idColumn).toBeDefined();
      expect(idColumn!.isPrimary).toBe(true);
      
      const releasedColumn = metadata.columns.find(c => c.propertyName === 'released');
      expect(releasedColumn).toBeDefined();
      expect(releasedColumn!.default).toBe(false);
      
      const expiresAtColumn = metadata.columns.find(c => c.propertyName === 'expiresAt');
      expect(expiresAtColumn).toBeDefined();
      expect(expiresAtColumn!.isNullable).toBe(true);
    });
  });

  describe('ProductEntity Schema Validation', () => {
    it('should have all required columns', () => {
      const metadata = dataSource.getMetadata(ProductEntity);
      const columnNames = metadata.columns.map(c => c.propertyName).sort();
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('sku');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('stockQuantity');
      expect(columnNames).toContain('reservedQuantity');
      expect(columnNames).toContain('status');
      expect(columnNames).toContain('createdAt');
      expect(columnNames).toContain('updatedAt');
    });
  });

  describe('OrderEntity Schema Validation', () => {
    it('should have all required columns', () => {
      const metadata = dataSource.getMetadata(OrderEntity);
      const columnNames = metadata.columns.map(c => c.propertyName).sort();
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('customerId');
      expect(columnNames).toContain('items');
      expect(columnNames).toContain('totalAmount');
      expect(columnNames).toContain('shippingAddress');
      expect(columnNames).toContain('status');
      expect(columnNames).toContain('paymentId');
      expect(columnNames).toContain('shipmentId');
      expect(columnNames).toContain('createdAt');
      expect(columnNames).toContain('updatedAt');
    });
  });

  describe('Database Tables Creation', () => {
    it('should create stock_reservations table', async () => {
      const queryRunner = dataSource.createQueryRunner();
      
      try {
        const tables = await queryRunner.getTables();
        const tableNames = tables.map(t => t.name);
        
        expect(tableNames).toContain('stock_reservations');
        expect(tableNames).toContain('products');
        expect(tableNames).toContain('orders');
        expect(tableNames).toContain('payments');
        expect(tableNames).toContain('shipments');
        expect(tableNames).toContain('event_store');
      } finally {
        await queryRunner.release();
      }
    });
  });
});

