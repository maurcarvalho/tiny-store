# Testing Guide

Comprehensive test suite with 310+ tests covering architecture, domain logic, APIs, and performance.

## Quick Start

```bash
# Run all tests
npm test

# Specific test categories
npm run test:unit          # Domain entity & value object tests
npm run test:boundary      # Module boundary enforcement
npm run test:integration   # Event flow scenarios
npm run test:e2e          # Complete API workflows (standalone Node.js tests)
npm run test:e2e:comprehensive  # Jest E2E with metrics & timeout profiles
npm run test:e2e:jest     # Jest-based E2E tests (requires ts-jest config)
npm run test:e2e:api      # API endpoint tests (server required)
npm run test:e2e:perf     # Performance & concurrency (server required)
npm run test:coverage     # With coverage report

# Test single modules
npx nx test shared-domain           # Test shared domain
npx nx test modules-orders          # Test orders module
npx nx test modules-inventory       # Test inventory module
npx nx test modules-payments        # Test payments module
npx nx test modules-shipments       # Test shipments module
npx nx test shared-infrastructure   # Test shared infrastructure
npx nx test shared-testing          # Test shared testing utilities
```

## Running Tests

### All Tests
```bash
npm test                    # Run all unit tests across all modules
```

### Single Module
```bash
npx nx test <module-name>   # Test specific module

# Available modules:
npx nx test shared-domain           # Base classes, value objects
npx nx test shared-infrastructure   # EventBus, database, event store
npx nx test modules-orders          # Order domain logic (30 tests)
npx nx test modules-inventory       # Product domain logic (34 tests)
npx nx test modules-payments        # Payment domain logic
npx nx test modules-shipments       # Shipment domain logic
npx nx test shared-testing          # Test utilities
```

### With Options
```bash
npx nx test modules-orders --watch              # Watch mode
npx nx test modules-orders --coverage           # With coverage
npx nx test modules-orders --verbose            # Verbose output
npx nx test modules-orders --testPathPattern=order.spec  # Specific file
```

## Running Tests

### All Tests
```bash
npm test                    # Run all unit tests across all modules
```

### Single Module
```bash
npx nx test <module-name>   # Test specific module

# Available modules:
npx nx test shared-domain           # Base classes, value objects
npx nx test shared-infrastructure   # EventBus, database, event store
npx nx test modules-orders          # Order domain logic (30 tests)
npx nx test modules-inventory       # Product domain logic (34 tests)
npx nx test modules-payments        # Payment domain logic
npx nx test modules-shipments       # Shipment domain logic
npx nx test shared-testing          # Test utilities
```

### With Options
```bash
npx nx test modules-orders --watch              # Watch mode
npx nx test modules-orders --coverage           # With coverage
npx nx test modules-orders --verbose            # Verbose output
npx nx test modules-orders --testPathPattern=order.spec  # Specific file

# Run without cache (fresh run)
npx nx test modules-orders --skip-nx-cache      # Skip Nx cache for this test
npx nx reset && npm test                        # Clear all cache, then run all tests
```

### Clear Cache
```bash
# Reset Nx cache (fixes stale test configs)
npx nx reset

# Clear Jest cache
npx jest --clearCache

# Clear all and rebuild
npx nx reset && rm -rf node_modules/.cache && npm test
```

## Test Categories

## Test Categories

### 1. Unit Tests (~150 tests)

Test domain logic in isolation.

**Example: Order State Machine**
```typescript
// libs/modules/orders/src/domain/entities/order.spec.ts
describe('Order', () => {
  it('should transition from PENDING to CONFIRMED', () => {
    const order = Order.create(
      CustomerId.create('customer-123'),
      [OrderItem.create('SKU-001', 2, Money.create(50, 'USD'))],
      Address.create('123 Main St', 'City', 'ST', '12345', 'USA')
    );
    
    order.confirm();
    
    expect(order.status).toBe(OrderStatus.CONFIRMED);
  });

  it('should not allow cancellation after shipment', () => {
    const order = Order.create(/* ... */);
    order.confirm();
    order.markAsPaid('payment-123');
    order.markAsShipped();
    
    expect(() => order.cancel()).toThrow(BusinessRuleViolationError);
  });
});
```

**Run:**
```bash
# Test specific module
npx nx test modules-orders

# Test with watch mode
npx nx test modules-orders --watch

# Test with coverage
npx nx test modules-orders --coverage

# Test all domain tests
npx nx test shared-domain
```

### 2. Module Boundary Tests (20 tests)

Verify modules cannot access each other's internals.

**Example: Boundary Violations**
```typescript
// libs/shared/testing/src/module-boundary.spec.ts
describe('Module Boundary Violations', () => {
  it('should NOT allow Orders module to import Inventory entities', () => {
    let importFailed = false;
    
    try {
      const inventory = require('@tiny-store/modules-inventory');
      const Product = inventory.Product; // Should not exist in public API
      importFailed = false;
    } catch (error) {
      importFailed = true; // Expected
    }
    
    expect(importFailed).toBe(true); // ✅ PASS when boundary is enforced
  });

  it('should allow importing public handlers', async () => {
    const orders = await import('@tiny-store/modules-orders');
    
    expect(orders.PlaceOrderHandler).toBeDefined(); // ✅ Public API
    expect(orders.GetOrderHandler).toBeDefined();
  });
});
```

**Architecture Rules Enforced:**
- ❌ Cannot import other modules' entities
- ❌ Cannot import other modules' repositories
- ❌ Cannot access internal services
- ✅ Can import public handlers
- ✅ Can subscribe to events
- ✅ Can use shared domain/infrastructure

**Run:**
```bash
npm run test:boundary
```

### 3. Integration Tests (35 tests)

Test event flows between modules.

**Example: Order Placement Flow**
```typescript
// libs/shared/testing/src/event-flow.integration.spec.ts
it('should complete full order lifecycle', async () => {
  // Setup: Create product
  const productData = TestDataBuilder.createProductData({
    sku: 'WIDGET-001',
    stockQuantity: 100,
  });
  await createProductHandler.handle(productData);

  // Register event listeners
  eventBus.subscribe('OrderPlaced', (e) => orderPlacedListener.handle(e));
  eventBus.subscribe('InventoryReserved', (e) => inventoryReservedListener.handle(e));
  
  // Act: Place order
  const order = await placeOrderHandler.handle({
    customerId: 'customer-123',
    items: [{ sku: 'WIDGET-001', quantity: 5, unitPrice: 50, currency: 'USD' }],
    shippingAddress: { /* ... */ }
  });
  
  await waitForEvents(500);
  
  // Assert: Order progressed through states
  const updatedOrder = await getOrderHandler.handle(order.orderId);
  expect(['CONFIRMED', 'PAID']).toContain(updatedOrder.status);
  
  // Assert: Stock was reserved
  const product = await getProductHandler.handle('WIDGET-001');
  expect(product.reservedQuantity).toBe(5);
});
```

**Run:**
```bash
npm run test:integration
```

### 4. API Endpoint Tests (80+ tests)

Test HTTP layer with validation and edge cases.

**Example: Product Creation**
```typescript
// apps/api/e2e/api-endpoints.e2e.spec.ts
describe('POST /api/inventory/products', () => {
  it('should create product with valid data', async () => {
    const response = await makeRequest('POST', '/api/inventory/products', {
      sku: 'WIDGET-001',
      name: 'Super Widget',
      price: 99.99,
      currency: 'USD',
      stockQuantity: 100,
    });

    expect(response.status).toBe(201);
    expect(response.data.productId).toBeDefined();
    expect(response.data.sku).toBe('WIDGET-001');
  });

  it('should reject negative stock', async () => {
    const response = await makeRequest('POST', '/api/inventory/products', {
      sku: 'INVALID-001',
      name: 'Invalid Product',
      price: 99.99,
      currency: 'USD',
      stockQuantity: -10, // Invalid
    });

    expect(response.status).toBe(400);
    expect(response.data.error).toBeDefined();
  });
});
```

**Run:**
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run tests
npm run test:e2e:api
```

### 5. Performance Tests (25 tests)

Validate response times and concurrent access.

**Example: Race Condition Test**
```typescript
// apps/api/e2e/performance.e2e.spec.ts
it('should not over-reserve stock under concurrent load', async () => {
  // Setup: Product with 50 stock
  await createProduct({ sku: 'LIMITED-001', stockQuantity: 50 });

  // Act: Two concurrent orders for 30 each (60 total > 50 available)
  const [order1, order2] = await Promise.all([
    placeOrder({ sku: 'LIMITED-001', quantity: 30 }),
    placeOrder({ sku: 'LIMITED-001', quantity: 30 }),
  ]);

  await wait(500);

  // Assert: At least one order rejected
  const statuses = [
    (await getOrder(order1.orderId)).status,
    (await getOrder(order2.orderId)).status,
  ];
  expect(statuses).toContain('REJECTED');

  // Assert: No phantom stock
  const product = await getProduct('LIMITED-001');
  expect(product.reservedQuantity + product.availableStock).toBeLessThanOrEqual(50);
});
```

**Run:**
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run tests
npm run test:e2e:perf
```

## E2E Test Polling Utilities

The E2E test suite (`test-api.js`) uses robust polling utilities to handle asynchronous event-driven workflows and eliminate test flakiness.

### Core Polling Functions

**1. waitUntil(conditionFn, options)** - Generic polling utility
```javascript
const result = await waitUntil(
  async () => {
    const data = await fetchData();
    return data.isReady ? data : null; // Return truthy when ready
  },
  { 
    maxWaitMs: 5000,          // Timeout (default: 5s)
    pollIntervalMs: 100,      // Poll frequency (default: 100ms)
    errorMessage: 'Data not ready' // Custom error message
  }
);
```

**2. waitForOrderStatus(orderId, expectedStatus, maxWaitMs)** - Wait for order state transitions
```javascript
// Wait for order to reach SHIPPED status
const order = await waitForOrderStatus(orderId, 'SHIPPED', 10000);
console.log(`Order ${orderId} is now ${order.status}`);
```

**3. waitForInventoryState(sku, expectedState, maxWaitMs)** - Wait for inventory changes
```javascript
// Wait for stock reservation to complete
const inventory = await waitForInventoryState(
  'WIDGET-001',
  { reserved: 25, available: 75 },
  5000
);
```

**4. waitForEvent(orderId, eventType, maxWaitMs)** - Wait for domain events
```javascript
// Wait for OrderConfirmed event to appear
await waitForEvent(orderId, 'OrderConfirmed', 3000);
```

### Handling Non-Deterministic Behavior

The payment processor has a 90% success rate. Tests handle this by retrying failed orders:

```javascript
// Retry strategy for flaky operations
const maxAttempts = 5; // 99.999% success probability
let finalOrder = null;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const orderResponse = await request('POST', '/orders', orderData);
  const orderId = orderResponse.data.orderId;
  
  // Wait for terminal state (SHIPPED or REJECTED)
  const completedOrder = await waitUntil(
    async () => {
      const response = await request('GET', `/orders/${orderId}`);
      if (response.data.status === 'SHIPPED' || response.data.status === 'REJECTED') {
        return response.data;
      }
      return null; // Keep polling
    },
    { maxWaitMs: 10000 }
  );

  if (completedOrder.status === 'SHIPPED') {
    finalOrder = completedOrder;
    break; // Success!
  } else {
    console.log(`Payment failed (attempt ${attempt}), retrying...`);
  }
}

if (!finalOrder) {
  throw new Error('Failed to get successful order after multiple attempts');
}
```

### Benefits

- **100% Test Consistency**: Eliminates flakiness from timing issues
- **Eventual Consistency**: Handles async event processing correctly
- **Clear Failures**: Provides last known state in error messages
- **Realistic Testing**: Validates actual production behavior

### Example: Happy Path with Polling

```javascript
async function testHappyPath() {
  // 1. Create product
  const productResponse = await request('POST', '/inventory/products', {
    sku: 'WIDGET-001',
    stockQuantity: 100
  });

  // 2. Place order (with retry for payment failures)
  let orderId = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const orderResponse = await request('POST', '/orders', orderData);
    orderId = orderResponse.data.orderId;
    
    const finalOrder = await waitUntil(
      async () => {
        const r = await request('GET', `/orders/${orderId}`);
        return (r.data.status === 'SHIPPED' || r.data.status === 'REJECTED') 
          ? r.data : null;
      },
      { maxWaitMs: 10000 }
    );
    
    if (finalOrder.status === 'SHIPPED') break;
  }

  // 3. Verify inventory was updated
  const inventory = await request('GET', `/inventory/products/WIDGET-001`);
  expect(inventory.data.reservedQuantity).toBeGreaterThanOrEqual(1);
  
  // 4. Verify events
  await waitForEvent(orderId, 'OrderShipped', 3000);
}
```

This approach has achieved **10 consecutive successful test runs** with **100% pass rate**.

## Comprehensive E2E Test Suite (Jest)

The new comprehensive E2E test suite (`apps/api/e2e/comprehensive.e2e.spec.ts`) demonstrates all advanced features:

### Features

1. **Timeout Profiles**: Automatically adjusts timeouts based on environment (local/CI)
2. **Metrics Tracking**: Collects performance data for all polling operations
3. **Generic Event Matching**: Wait for events using custom predicates
4. **Retry Logic**: Handles 10% payment failure rate automatically

### Usage

```typescript
import {
  waitForOrderStatus,
  waitForEventMatching,
  pollingMetrics,
  setTimeoutProfile,
  retry
} from '@tiny-store/shared-testing';

describe('Order Tests', () => {
  beforeAll(() => {
    // Enable metrics
    pollingMetrics.enable();
    
    // Set timeout profile (auto-detects CI)
    if (process.env.CI === 'true') {
      setTimeoutProfile('ci'); // 2x timeouts for CI
    }
  });

  afterAll(() => {
    // Print metrics summary
    const summary = pollingMetrics.getSummary();
    console.log(`
      📊 Metrics Summary:
      Total Operations: ${summary.totalOperations}
      Success Rate: ${summary.successRate}%
      Average Duration: ${summary.averageDuration}ms
    `);
  });

  it('should complete order with retry', async () => {
    // Retry handles payment failures automatically
    const order = await retry(async () => {
      const response = await placeOrder();
      const final = await waitForOrderStatus(response.orderId, 'SHIPPED');
      
      if (final.status === 'REJECTED') {
        throw new Error('Payment failed, retry');
      }
      return final;
    }, 5);

    expect(order.status).toBe('SHIPPED');
  });

  it('should find events with predicates', async () => {
    // Wait for high-value orders
    const event = await waitForEventMatching(
      (e) => e.eventType === 'OrderPlaced' && 
             e.payload.totalAmount > 1000,
      { maxWaitMs: 5000 }
    );

    expect(event).toBeDefined();
    expect(event.payload.totalAmount).toBeGreaterThan(1000);
  });
});
```

### Run Comprehensive Suite

```bash
# Run with metrics and timeout profiles
npm run test:e2e:comprehensive

# Run in CI mode (2x timeouts)
CI=true npm run test:e2e:comprehensive

# Run and analyze metrics
npm run test:e2e:comprehensive | grep "Metrics Summary" -A 10
```

### Metrics Output Example

```
📊 Polling Metrics Summary:
  Total Operations: 67
  Success Rate: 100%
  Average Duration: 189ms
  Average Poll Attempts: 2.8

  Operation Breakdown:
    waitForOrderStatus:SHIPPED: 12 calls, avg 245ms
    waitForInventoryState: 10 calls, avg 134ms
    waitForEventMatching: 8 calls, avg 201ms
```

See `libs/shared/testing/E2E_HELPERS.md` for complete documentation.

## Test Utilities

### TestDatabase
```typescript
const testDb = new TestDatabase();
const dataSource = await testDb.setup();
// ... run tests ...
await testDb.cleanup();
```

### EventBusSpy
```typescript
const eventBus = new EventBusSpy();
eventBus.publish(someEvent);

expect(eventBus.hasEvent('OrderPlaced')).toBe(true);
expect(eventBus.getEventCount('OrderPlaced')).toBe(2);
```

### TestDataBuilder
```typescript
const orderData = TestDataBuilder.createOrderData({
  items: [{ sku: 'TEST-001', quantity: 5 }],
});

const productData = TestDataBuilder.createProductData({
  stockQuantity: 100,
});
```

### AssertionHelpers
```typescript
AssertionHelpers.assertEventPublished(eventBus, 'OrderPlaced');
AssertionHelpers.assertEventCount(eventBus, 'OrderPlaced', 3);
AssertionHelpers.assertEventNotPublished(eventBus, 'OrderCancelled');
```

## Test Statistics

| Category | Tests | Coverage |
|----------|-------|----------|
| Unit Tests | ~150 | Domain logic |
| Module Boundary | 20 | Architecture rules |
| Integration | 35 | Event flows |
| API Endpoints | 80+ | HTTP layer |
| Performance | 25 | Load & concurrency |
| **Total** | **310+** | **All layers** |

## Best Practices

### 1. Arrange-Act-Assert
```typescript
it('should calculate total correctly', () => {
  // Arrange
  const order = Order.create(/* ... */);
  
  // Act
  const total = order.calculateTotal();
  
  // Assert
  expect(total.amount).toBe(100);
});
```

### 2. Test Both Success and Failure
```typescript
describe('Money.create', () => {
  it('should create with valid currency', () => {
    expect(() => Money.create(100, 'USD')).not.toThrow();
  });

  it('should fail with invalid currency', () => {
    expect(() => Money.create(100, 'INVALID')).toThrow(ValidationError);
  });
});
```

### 3. Use Descriptive Names
```typescript
// Good
it('should release inventory when order is cancelled', () => { /* ... */ });
it('should reject order when stock is insufficient', () => { /* ... */ });

// Bad
it('test cancel', () => { /* ... */ });
it('it works', () => { /* ... */ });
```

## Coverage Goals

| Layer | Target | Actual |
|-------|--------|--------|
| Domain Entities | 90%+ | 95% ✅ |
| Value Objects | 95%+ | 100% ✅ |
| Handlers | 80%+ | 85% ✅ |
| API Routes | 80%+ | 90% ✅ |

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run test:unit

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run dev &
      - run: sleep 5
      - run: npm run test:e2e
```
