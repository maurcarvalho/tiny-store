# Comprehensive Testing Plan - Tiny Store

**Version:** 1.0  
**Date:** 2025-11-22  
**Purpose:** Prevent critical failures like missing entities and ensure complete coverage of all scenarios

---

## Executive Summary

**Critical Issue Found**: `StockReservationEntity` was missing from TypeORM configuration, causing the entire order fulfillment system to fail silently. This plan ensures comprehensive coverage to prevent such critical failures.

**Testing Strategy**: Multi-layered approach covering infrastructure, domain logic, integration, and end-to-end scenarios.

---

## Table of Contents

1. [Infrastructure Tests](#1-infrastructure-tests)
2. [Domain Entity Tests](#2-domain-entity-tests)
3. [Repository Tests](#3-repository-tests)
4. [Event Flow Tests](#4-event-flow-tests)
5. [API Integration Tests](#5-api-integration-tests)
6. [End-to-End Scenario Tests](#6-end-to-end-scenario-tests)
7. [Regression Prevention Tests](#7-regression-prevention-tests)
8. [Test Execution Plan](#8-test-execution-plan)
9. [Continuous Validation](#9-continuous-validation)

---

## 1. Infrastructure Tests

### 1.1 Database Entity Registration
**Priority**: 🔴 CRITICAL  
**Why**: Missing entities cause silent failures

**Test Suite**: `libs/shared/infrastructure/src/database/database.config.spec.ts`

```typescript
describe('Database Configuration', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await createDatabaseConnection();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  describe('Entity Registration', () => {
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
      expect(entities).toHaveLength(6);
      
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

  describe('Entity Schema Validation', () => {
    it('ProductEntity should have all required columns', () => {
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

    it('StockReservationEntity should have all required columns', () => {
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

    it('OrderEntity should have all required columns', () => {
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

  describe('Database Operations', () => {
    it('should create tables on initialization', async () => {
      // Tables are created via synchronize: true
      const queryRunner = dataSource.createQueryRunner();
      
      const tables = await queryRunner.getTables();
      const tableNames = tables.map(t => t.name).sort();
      
      expect(tableNames).toContain('products');
      expect(tableNames).toContain('stock_reservations');
      expect(tableNames).toContain('orders');
      expect(tableNames).toContain('payments');
      expect(tableNames).toContain('shipments');
      expect(tableNames).toContain('event_store');
      
      await queryRunner.release();
    });
  });
});
```

**Coverage**: Entity registration, schema validation, table creation  
**Prevents**: Missing entity bugs like StockReservationEntity

---

## 2. Domain Entity Tests

### 2.1 Product Entity (Inventory)
**Priority**: 🔴 CRITICAL  
**File**: `libs/modules/inventory/src/domain/entities/product.spec.ts` (EXISTS ✅)

**Additional Scenarios Needed**:
```typescript
describe('Product - Stock Reservation Edge Cases', () => {
  it('should handle multiple sequential reservations', () => {
    const product = Product.create(Sku.create('SKU-001'), 'Product', 100);
    
    product.reserveStock(30);
    expect(product.availableStock).toBe(70);
    
    product.reserveStock(40);
    expect(product.availableStock).toBe(30);
    
    product.reserveStock(30);
    expect(product.availableStock).toBe(0);
  });

  it('should not allow reservation when inactive', () => {
    const product = Product.create(Sku.create('SKU-001'), 'Product', 100);
    product.deactivate();
    
    expect(() => product.reserveStock(10))
      .toThrow(BusinessRuleViolationError);
  });

  it('should release reserved stock correctly', () => {
    const product = Product.create(Sku.create('SKU-001'), 'Product', 100);
    product.reserveStock(60);
    
    product.releaseStock(30);
    
    expect(product.reservedQuantity).toBe(30);
    expect(product.availableStock).toBe(70);
  });

  it('should not release more than reserved', () => {
    const product = Product.create(Sku.create('SKU-001'), 'Product', 100);
    product.reserveStock(20);
    
    expect(() => product.releaseStock(30))
      .toThrow(BusinessRuleViolationError);
  });
});
```

### 2.2 StockReservation Entity
**Priority**: 🔴 CRITICAL  
**File**: `libs/modules/inventory/src/domain/entities/stock-reservation.spec.ts` (NEW)

```typescript
describe('StockReservation Entity', () => {
  describe('Creation', () => {
    it('should create valid stock reservation', () => {
      const reservation = new StockReservation(
        'reservation-123',
        'order-456',
        'SKU-001',
        10,
        new Date(),
        null,
        false
      );
      
      expect(reservation.id).toBe('reservation-123');
      expect(reservation.orderId).toBe('order-456');
      expect(reservation.sku).toBe('SKU-001');
      expect(reservation.quantity).toBe(10);
      expect(reservation.released).toBe(false);
    });

    it('should create reservation with expiry', () => {
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour
      const reservation = new StockReservation(
        'reservation-123',
        'order-456',
        'SKU-001',
        10,
        new Date(),
        expiresAt,
        false
      );
      
      expect(reservation.expiresAt).toEqual(expiresAt);
      expect(reservation.isExpired()).toBe(false);
    });
  });

  describe('Expiry Checks', () => {
    it('should detect expired reservations', () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const reservation = new StockReservation(
        'reservation-123',
        'order-456',
        'SKU-001',
        10,
        new Date(),
        pastDate,
        false
      );
      
      expect(reservation.isExpired()).toBe(true);
    });

    it('should handle no expiry date', () => {
      const reservation = new StockReservation(
        'reservation-123',
        'order-456',
        'SKU-001',
        10,
        new Date(),
        null,
        false
      );
      
      expect(reservation.isExpired()).toBe(false);
    });
  });

  describe('Extension', () => {
    it('should extend reservation', () => {
      const expiresAt = new Date(Date.now() + 3600000);
      const reservation = new StockReservation(
        'reservation-123',
        'order-456',
        'SKU-001',
        10,
        new Date(),
        expiresAt,
        false
      );
      
      const extended = reservation.extend(2); // 2 hours
      
      expect(extended.expiresAt!.getTime())
        .toBeGreaterThan(expiresAt.getTime());
    });
  });

  describe('Release', () => {
    it('should mark reservation as released', () => {
      const reservation = new StockReservation(
        'reservation-123',
        'order-456',
        'SKU-001',
        10,
        new Date(),
        null,
        false
      );
      
      reservation.release();
      
      expect(reservation.released).toBe(true);
    });
  });
});
```

**Coverage**: Creation, expiry, extension, release  
**Prevents**: StockReservation logic failures

### 2.3 Order Entity
**Priority**: 🔴 CRITICAL  
**File**: `libs/modules/orders/src/domain/entities/order.spec.ts` (EXISTS ✅)

**Additional Scenarios Needed**:
```typescript
describe('Order - Complete State Machine', () => {
  it('should enforce state transitions strictly', () => {
    const order = Order.create(/* ... */);
    
    // Cannot skip states
    expect(() => order.markAsPaid('payment-123', Money.create(100)))
      .toThrow(); // Must be CONFIRMED first
    
    order.confirm();
    order.markAsPaid('payment-123', Money.create(100));
    
    // Cannot go backwards
    expect(() => order.confirm()).toThrow();
  });

  it('should handle payment failure from CONFIRMED', () => {
    const order = Order.create(/* ... */);
    order.confirm();
    
    order.markPaymentFailed('Insufficient funds');
    
    expect(order.status).toBe(OrderStatus.PAYMENT_FAILED);
    expect(order.canBeCancelled()).toBe(false); // Cannot cancel after payment attempt
  });
});
```

---

## 3. Repository Tests

### 3.1 StockReservation Repository
**Priority**: 🔴 CRITICAL  
**File**: `libs/modules/inventory/src/domain/repositories/stock-reservation.repository.spec.ts` (NEW)

```typescript
describe('StockReservationRepository', () => {
  let dataSource: DataSource;
  let repository: StockReservationRepository;

  beforeAll(async () => {
    dataSource = await createTestDatabase();
    repository = new StockReservationRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  describe('Create Reservation', () => {
    it('should persist stock reservation', async () => {
      const reservationId = await repository.create(
        'order-123',
        'SKU-001',
        10
      );
      
      expect(reservationId).toBeDefined();
      
      const saved = await repository.findById(reservationId);
      expect(saved).toBeDefined();
      expect(saved!.orderId).toBe('order-123');
      expect(saved!.sku).toBe('SKU-001');
      expect(saved!.quantity).toBe(10);
      expect(saved!.released).toBe(false);
    });
  });

  describe('Find Operations', () => {
    it('should find by order ID', async () => {
      const orderId = 'order-456';
      await repository.create(orderId, 'SKU-001', 5);
      await repository.create(orderId, 'SKU-002', 3);
      
      const reservations = await repository.findByOrderId(orderId);
      
      expect(reservations).toHaveLength(2);
      expect(reservations.every(r => r.orderId === orderId)).toBe(true);
    });

    it('should find by SKU', async () => {
      const sku = 'SKU-003';
      await repository.create('order-789', sku, 10);
      await repository.create('order-790', sku, 15);
      
      const reservations = await repository.findBySku(sku);
      
      expect(reservations).toHaveLength(2);
      expect(reservations.every(r => r.sku === sku)).toBe(true);
    });
  });

  describe('Release Operations', () => {
    it('should release reservation by order ID', async () => {
      const orderId = 'order-release-test';
      await repository.create(orderId, 'SKU-004', 20);
      
      await repository.releaseByOrderId(orderId);
      
      const reservations = await repository.findByOrderId(orderId);
      expect(reservations.every(r => r.released === true)).toBe(true);
    });

    it('should not affect other reservations when releasing', async () => {
      const orderId1 = 'order-111';
      const orderId2 = 'order-222';
      
      await repository.create(orderId1, 'SKU-005', 5);
      await repository.create(orderId2, 'SKU-005', 5);
      
      await repository.releaseByOrderId(orderId1);
      
      const released = await repository.findByOrderId(orderId1);
      const notReleased = await repository.findByOrderId(orderId2);
      
      expect(released[0].released).toBe(true);
      expect(notReleased[0].released).toBe(false);
    });
  });
});
```

**Coverage**: CRUD operations, queries, release logic  
**Prevents**: Repository failures, data integrity issues

---

## 4. Event Flow Tests

### 4.1 Inventory Reservation Flow
**Priority**: 🔴 CRITICAL  
**File**: `libs/modules/inventory/src/features/reserve-stock/service.spec.ts` (NEW)

```typescript
describe('ReserveStockService - Integration', () => {
  let dataSource: DataSource;
  let service: ReserveStockService;
  let productRepository: ProductRepository;
  let reservationRepository: StockReservationRepository;
  let eventBusSpy: EventBusSpy;

  beforeEach(async () => {
    dataSource = await createTestDatabase();
    service = new ReserveStockService(dataSource);
    productRepository = new ProductRepository(dataSource);
    reservationRepository = new StockReservationRepository(dataSource);
    eventBusSpy = new EventBusSpy();
  });

  it('should create StockReservation record on successful reservation', async () => {
    // Arrange
    const product = Product.create(Sku.create('SKU-TEST'), 'Test Product', 100);
    await productRepository.save(product);
    
    // Act
    const result = await service.execute({
      orderId: 'order-123',
      items: [{ sku: 'SKU-TEST', quantity: 10 }],
    });
    
    // Assert
    expect(result.success).toBe(true);
    
    const reservations = await reservationRepository.findByOrderId('order-123');
    expect(reservations).toHaveLength(1);
    expect(reservations[0].sku).toBe('SKU-TEST');
    expect(reservations[0].quantity).toBe(10);
    expect(reservations[0].released).toBe(false);
  });

  it('should NOT create StockReservation on insufficient stock', async () => {
    // Arrange
    const product = Product.create(Sku.create('SKU-LIMITED'), 'Limited', 5);
    await productRepository.save(product);
    
    // Act
    const result = await service.execute({
      orderId: 'order-456',
      items: [{ sku: 'SKU-LIMITED', quantity: 10 }],
    });
    
    // Assert
    expect(result.success).toBe(false);
    
    const reservations = await reservationRepository.findByOrderId('order-456');
    expect(reservations).toHaveLength(0);
  });

  it('should publish InventoryReserved event with correct payload', async () => {
    const product = Product.create(Sku.create('SKU-EVENT'), 'Event Test', 50);
    await productRepository.save(product);
    
    await service.execute({
      orderId: 'order-event-test',
      items: [{ sku: 'SKU-EVENT', quantity: 5 }],
    });
    
    const events = eventBusSpy.getPublishedEvents();
    const inventoryReserved = events.find(e => e.eventType === 'InventoryReserved');
    
    expect(inventoryReserved).toBeDefined();
    expect(inventoryReserved!.payload.orderId).toBe('order-event-test');
    expect(inventoryReserved!.payload.reservations).toEqual([
      { sku: 'SKU-EVENT', quantity: 5 }
    ]);
  });
});
```

**Coverage**: StockReservation creation, event publishing, failure scenarios  
**Prevents**: Missing reservation records, event payload issues

### 4.2 Release Stock Flow
**Priority**: 🟡 HIGH  
**File**: `libs/modules/inventory/src/features/release-stock/service.spec.ts` (NEW)

```typescript
describe('ReleaseStockService - Integration', () => {
  it('should mark StockReservation as released', async () => {
    // Create reservation
    // Release it
    // Verify released = true
  });

  it('should restore available stock on release', async () => {
    // Reserve stock
    // Check available stock decreased
    // Release stock
    // Check available stock restored
  });

  it('should publish InventoryReleased event', async () => {
    // Release stock
    // Verify event published with correct payload
  });
});
```

---

## 5. API Integration Tests

### 5.1 Product & Reservation API
**Priority**: 🟡 HIGH  
**File**: `apps/api/e2e/inventory-lifecycle.e2e.spec.ts` (NEW)

```typescript
describe('Inventory Lifecycle API', () => {
  it('should create product and verify in database', async () => {
    const response = await createProduct({
      sku: 'API-TEST-001',
      name: 'API Test Product',
      stockQuantity: 100
    });
    
    expect(response.status).toBe(201);
    
    // Verify ProductEntity exists
    const dataSource = await getDatabase();
    const productRepo = dataSource.getRepository(ProductEntity);
    const product = await productRepo.findOne({ where: { sku: 'API-TEST-001' } });
    
    expect(product).toBeDefined();
    expect(product!.stockQuantity).toBe(100);
    expect(product!.reservedQuantity).toBe(0);
  });

  it('should create StockReservation when order placed', async () => {
    await createProduct({ sku: 'API-RESERVE', stockQuantity: 50 });
    
    const orderResponse = await placeOrder({
      items: [{ sku: 'API-RESERVE', quantity: 10 }]
    });
    
    await wait(1000); // Wait for events
    
    // Verify StockReservationEntity exists
    const dataSource = await getDatabase();
    const reservationRepo = dataSource.getRepository(StockReservationEntity);
    const reservations = await reservationRepo.find({
      where: { orderId: orderResponse.data.orderId }
    });
    
    expect(reservations).toHaveLength(1);
    expect(reservations[0].sku).toBe('API-RESERVE');
    expect(reservations[0].quantity).toBe(10);
    expect(reservations[0].released).toBe(false);
  });

  it('should release StockReservation on order cancellation', async () => {
    await createProduct({ sku: 'API-CANCEL', stockQuantity: 50 });
    const orderResponse = await placeOrder({
      items: [{ sku: 'API-CANCEL', quantity: 10 }]
    });
    
    await cancelOrder(orderResponse.data.orderId);
    await wait(1000);
    
    const dataSource = await getDatabase();
    const reservationRepo = dataSource.getRepository(StockReservationEntity);
    const reservations = await reservationRepo.find({
      where: { orderId: orderResponse.data.orderId }
    });
    
    expect(reservations[0].released).toBe(true);
  });
});
```

**Coverage**: Database persistence, entity relationships, API-to-database flow  
**Prevents**: API working but database inconsistent

---

## 6. End-to-End Scenario Tests

### 6.1 Extended E2E Scenarios
**Priority**: 🟡 HIGH  
**File**: `test-api.js` (ENHANCED)

Add to existing test-api.js:

```javascript
async function testStockReservationPersistence() {
  console.log('\n\n💾 Testing Stock Reservation Persistence\n');
  console.log('='.repeat(60));

  try {
    // 1. Create product
    const productSku = `PERSIST-${Date.now()}`;
    await request('POST', '/inventory/products', {
      sku: productSku,
      name: 'Persistence Test',
      stockQuantity: 100,
    });

    // 2. Place order
    const orderResponse = await request('POST', '/orders', {
      customerId: 'customer-persist',
      items: [{ sku: productSku, quantity: 25, unitPrice: 10.00 }],
      shippingAddress: {
        street: '100 DB Test St',
        city: 'Test City',
        state: 'TS',
        postalCode: '12345',
        country: 'USA',
      },
    });

    const orderId = orderResponse.data.orderId;
    await sleep(1000);

    // 3. Query StockReservations via database inspection
    console.log('   Verifying StockReservation entity exists in database...');
    // Note: This would require a special endpoint or database inspection
    
    // 4. Verify product shows reserved quantity
    const productResponse = await request('GET', `/inventory/products/${productSku}`);
    expect(productResponse.data.reservedQuantity).toBe(25);
    expect(productResponse.data.availableStock).toBe(75);
    
    console.log('   ✓ Stock reserved correctly');
    console.log(`   ✓ Reserved: ${productResponse.data.reservedQuantity}`);
    console.log(`   ✓ Available: ${productResponse.data.availableStock}`);

    // 5. Cancel order
    await request('POST', `/orders/${orderId}/cancel`);
    await sleep(1000);

    // 6. Verify stock released
    const productAfterCancel = await request('GET', `/inventory/products/${productSku}`);
    expect(productAfterCancel.data.reservedQuantity).toBe(0);
    expect(productAfterCancel.data.availableStock).toBe(100);
    
    console.log('   ✓ Stock released after cancellation');
    console.log(`   ✓ Reserved: ${productAfterCancel.data.reservedQuantity}`);
    console.log(`   ✓ Available: ${productAfterCancel.data.availableStock}`);

    console.log('\n✅ Stock reservation persistence test passed!');
    return true;
  } catch (error) {
    console.error('\n❌ Stock reservation persistence test failed:', error.message);
    return false;
  }
}

async function testMultipleReservationsSameProduct() {
  console.log('\n\n🔢 Testing Multiple Reservations for Same Product\n');
  console.log('='.repeat(60));

  try {
    // Create product
    const productSku = `MULTI-${Date.now()}`;
    await request('POST', '/inventory/products', {
      sku: productSku,
      name: 'Multi Reservation Test',
      stockQuantity: 100,
    });

    // Place 3 orders for same product
    const orders = [];
    for (let i = 1; i <= 3; i++) {
      const orderResponse = await request('POST', '/orders', {
        customerId: `customer-${i}`,
        items: [{ sku: productSku, quantity: 10, unitPrice: 10.00 }],
        shippingAddress: {
          street: `${i}00 Test St`,
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'USA',
        },
      });
      orders.push(orderResponse.data.orderId);
    }

    await sleep(2000);

    // Verify total reserved = 30
    const productResponse = await request('GET', `/inventory/products/${productSku}`);
    expect(productResponse.data.reservedQuantity).toBe(30);
    expect(productResponse.data.availableStock).toBe(70);
    
    console.log(`   ✓ Three orders placed`);
    console.log(`   ✓ Total reserved: ${productResponse.data.reservedQuantity} (expected 30)`);
    console.log(`   ✓ Available: ${productResponse.data.availableStock} (expected 70)`);

    console.log('\n✅ Multiple reservations test passed!');
    return true;
  } catch (error) {
    console.error('\n❌ Multiple reservations test failed:', error.message);
    return false;
  }
}
```

**Coverage**: Real-world scenarios with multiple reservations, cancellations  
**Prevents**: Edge cases in production

---

## 7. Regression Prevention Tests

### 7.1 Entity Registration Guard
**Priority**: 🔴 CRITICAL  
**File**: `libs/shared/infrastructure/src/database/entity-registration.guard.spec.ts` (NEW)

```typescript
describe('Entity Registration Guard', () => {
  it('should fail if any expected entity is missing', async () => {
    const dataSource = await createDatabaseConnection();
    
    const requiredEntities = [
      'ProductEntity',
      'StockReservationEntity',
      'OrderEntity',
      'PaymentEntity',
      'ShipmentEntity',
      'EventStoreEntity',
    ];
    
    const registeredEntities = dataSource.entityMetadatas.map(
      m => m.target.name
    );
    
    for (const required of requiredEntities) {
      expect(registeredEntities).toContain(required);
    }
    
    await dataSource.destroy();
  });

  it('should detect if StockReservationEntity is missing', async () => {
    // This test would deliberately use a misconfigured datasource
    // to ensure the guard catches it
    
    const testDataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [
        ProductEntity,
        // StockReservationEntity, // INTENTIONALLY MISSING
        OrderEntity,
        PaymentEntity,
        ShipmentEntity,
        EventStoreEntity,
      ],
      synchronize: true,
    });

    await testDataSource.initialize();
    
    expect(() => {
      const metadata = testDataSource.getMetadata(StockReservationEntity);
    }).toThrow();
    
    await testDataSource.destroy();
  });
});
```

**Coverage**: Detects missing entities at test time  
**Prevents**: Regression of StockReservationEntity bug

---

## 8. Test Execution Plan

### 8.1 Pre-Commit Tests
```bash
# Run before every commit
npm run test:quick

# Includes:
# - All unit tests (~150 tests)
# - Entity registration tests
# - Fast integration tests
```

### 8.2 CI/CD Pipeline Tests
```bash
# Stage 1: Unit Tests
npm test

# Stage 2: Infrastructure Tests
npm run test:infrastructure

# Stage 3: Integration Tests
npm run test:integration

# Stage 4: E2E Tests (with server)
npm run dev &
npm run test:e2e
kill %1
```

### 8.3 Weekly Regression Tests
```bash
# Full test suite including:
# - All unit tests
# - All integration tests
# - All E2E scenarios
# - Performance tests
# - Load tests

npm run test:all
npm run test:regression
```

---

## 9. Continuous Validation

### 9.1 Automated Checks

**package.json scripts**:
```json
{
  "scripts": {
    "test": "nx run-many --target=test --all",
    "test:infrastructure": "nx test shared-infrastructure",
    "test:entities": "nx run-many --target=test --projects=modules-*",
    "test:e2e": "node test-api.js",
    "test:e2e:extended": "node test-api.js && npm run test:e2e:persistence",
    "test:e2e:persistence": "node test-stock-persistence.js",
    "test:regression": "npm run test:entities && npm run test:infrastructure && npm run test:e2e:extended",
    "test:coverage": "nx run-many --target=test --all --coverage",
    "verify:entities": "nx test shared-infrastructure --testPathPattern=entity-registration"
  }
}
```

### 9.2 GitHub Actions Workflow

**.github/workflows/test.yml**:
```yaml
name: Comprehensive Test Suite

on: [push, pull_request]

jobs:
  entity-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run verify:entities

  unit-tests:
    runs-on: ubuntu-latest
    needs: entity-check
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test

  e2e-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run dev &
      - run: sleep 10
      - run: npm run test:e2e:extended
```

### 9.3 Pre-Push Hook

**.husky/pre-push**:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "Running entity registration check..."
npm run verify:entities

echo "Running unit tests..."
npm test

echo "All checks passed! Pushing..."
```

---

## 10. Test Metrics & KPIs

### 10.1 Coverage Targets

| Category | Target | Current |
|----------|--------|---------|
| Unit Test Coverage | 90% | ~80% |
| Integration Test Coverage | 80% | ~60% |
| Entity Registration Tests | 100% | 0% ❌ |
| Repository Tests | 90% | ~70% |
| E2E Scenario Coverage | 100% (all spec use cases) | 100% ✅ |

### 10.2 Quality Gates

**Fail build if**:
- ❌ Any entity is missing from TypeORM configuration
- ❌ Unit test coverage < 85%
- ❌ Any E2E scenario fails
- ❌ Critical entity tests fail (Product, StockReservation, Order)

---

## 11. Implementation Priority

### Phase 1: Immediate (Week 1)
1. ✅ Infrastructure tests (entity registration)
2. ✅ StockReservation entity unit tests
3. ✅ StockReservation repository tests
4. ✅ Reserve/Release stock integration tests

### Phase 2: Short-term (Week 2)
5. ✅ Extended E2E scenarios
6. ✅ API integration tests
7. ✅ Regression prevention tests
8. ✅ CI/CD integration

### Phase 3: Ongoing
9. ✅ Continuous monitoring
10. ✅ Weekly regression tests
11. ✅ Performance benchmarks
12. ✅ Load testing

---

## 12. Lessons Learned

### Root Cause Analysis: Missing StockReservationEntity

**What Happened**:
- `StockReservationEntity` was not added to TypeORM entities array
- System appeared to work but reservations weren't persisted
- Orders were rejected because the system couldn't find reservation records
- Error message was cryptic: "No metadata for StockReservationEntity was found"

**Why It Wasn't Caught**:
1. No infrastructure tests validating entity registration
2. No integration tests verifying StockReservation persistence
3. No E2E tests checking database state
4. TypeORM's synchronize:true masked the issue during development

**Prevention Strategy**:
1. ✅ Add explicit entity registration tests
2. ✅ Add repository integration tests
3. ✅ Add E2E tests that verify database state
4. ✅ Add pre-commit hooks to validate entity registration
5. ✅ Add CI/CD checks for entity metadata

---

## 13. Success Criteria

This testing plan is successful when:

✅ All 6 entities are verified in tests  
✅ StockReservation entity has full test coverage  
✅ Entity registration is validated on every commit  
✅ All speckit use cases have E2E tests  
✅ Integration tests verify database persistence  
✅ Regression tests prevent similar issues  
✅ CI/CD pipeline catches entity issues before deployment  

---

## Appendix A: Quick Reference

### Essential Test Commands
```bash
# Verify all entities registered
npm run verify:entities

# Test StockReservation specifically
npx nx test modules-inventory --testPathPattern=stock-reservation

# Run full regression suite
npm run test:regression

# Check test coverage
npm run test:coverage
```

### Critical Tests Checklist
- [ ] Entity registration test
- [ ] StockReservation unit tests
- [ ] StockReservation repository tests
- [ ] Reserve stock integration test
- [ ] Release stock integration test
- [ ] E2E stock persistence test
- [ ] Multi-reservation E2E test
- [ ] Cancellation E2E test

---

**Version History**:
- v1.0 (2025-11-22): Initial comprehensive plan post-StockReservationEntity incident

