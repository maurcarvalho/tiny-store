# E2E Helpers - Comprehensive Polling Utilities

This library provides robust polling utilities for E2E tests with advanced features including timeout profiles, metrics tracking, and generic event matching.

## Features

### 1. Polling Utilities with Timeout Profiles

Environment-aware timeout configurations:

```typescript
import { setTimeoutProfile, waitForOrderStatus } from '@tiny-store/shared-testing';

// Automatic profile selection based on NODE_ENV and CI env var
// - 'local': Standard timeouts (5s default)
// - 'ci': Extended timeouts (10s default) for slower CI environments
// - 'development': Fast timeouts (3s default) for quick feedback

// Manual override
setTimeoutProfile('ci'); // Use CI timeouts
```

**Timeout Profiles:**

| Profile | Default Max Wait | Poll Interval | Order Transition | Inventory Update | Event Propagation |
|---------|------------------|---------------|------------------|------------------|-------------------|
| local   | 5s               | 100ms         | 10s              | 5s               | 3s                |
| ci      | 10s              | 200ms         | 20s              | 10s              | 6s                |
| development | 3s           | 50ms          | 8s               | 3s               | 2s                |

### 2. Metrics Tracking

Track polling performance for analysis and optimization:

```typescript
import { pollingMetrics } from '@tiny-store/shared-testing';

// Enable metrics
pollingMetrics.enable();

// ... run tests ...

// Get summary
const summary = pollingMetrics.getSummary();
console.log(`Total Operations: ${summary.totalOperations}`);
console.log(`Success Rate: ${summary.successRate}%`);
console.log(`Average Duration: ${summary.averageDuration}ms`);
console.log(`Average Poll Attempts: ${summary.averagePollAttempts}`);

// Per-operation breakdown
Object.entries(summary.operationBreakdown).forEach(([op, data]) => {
  console.log(`${op}: ${data.count} calls, ${data.avgDuration}ms avg`);
});
```

**Metrics Output Example:**
```
📊 Polling Metrics Summary:
  Total Operations: 45
  Success Rate: 100%
  Average Duration: 234ms
  Average Poll Attempts: 3

  Operation Breakdown:
    waitForOrderStatus:SHIPPED: 12 calls, avg 245ms
    waitForInventoryState: 8 calls, avg 156ms
    waitForEvent:OrderPlaced: 15 calls, avg 89ms
    waitForEventMatching: 10 calls, avg 312ms
```

### 3. Generic Event Waiter with Predicates

Wait for events matching custom criteria:

```typescript
import { waitForEventMatching, waitForEvents } from '@tiny-store/shared-testing';

// Wait for event matching predicate
const highValueOrder = await waitForEventMatching(
  (event) => 
    event.eventType === 'OrderPlaced' && 
    event.payload.totalAmount > 1000,
  { orderId, maxWaitMs: 5000 }
);

// Wait for multiple specific events
await waitForEvents(
  ['OrderPlaced', 'OrderConfirmed', 'OrderPaid'],
  { orderId }
);

// Wait for any payment-related event
const paymentEvent = await waitForEventMatching(
  (event) => event.eventType.includes('Payment')
);

// Wait for order from specific customer
const customerOrder = await waitForEventMatching(
  (event) => 
    event.eventType === 'OrderPlaced' &&
    event.payload.customerId === 'premium-customer-123'
);
```

### 4. Core Polling Functions

All polling functions now support timeout profiles and metrics:

#### waitUntil
```typescript
const result = await waitUntil(
  async () => {
    const data = await fetchData();
    return data.isReady ? data : null;
  },
  {
    maxWaitMs: 5000,          // Override profile default
    pollIntervalMs: 100,      // Override profile default
    operationName: 'waitForCustomCondition', // For metrics
    errorMessage: 'Custom condition not met'
  }
);
```

#### waitForOrderStatus
```typescript
// Uses timeout profile automatically
const order = await waitForOrderStatus(orderId, 'SHIPPED');

// Or override
const order = await waitForOrderStatus(orderId, 'SHIPPED', 15000);
```

#### waitForInventoryState
```typescript
const inventory = await waitForInventoryState(
  'WIDGET-001',
  { reserved: 25, available: 75 }
);
```

#### waitForEvent
```typescript
await waitForEvent(orderId, 'OrderConfirmed');
```

### 5. Retry Utility

Retry operations with exponential backoff:

```typescript
import { retry } from '@tiny-store/shared-testing';

const result = await retry(
  async () => {
    const order = await placeOrder();
    if (order.status === 'REJECTED') {
      throw new Error('Payment failed');
    }
    return order;
  },
  5,     // maxAttempts
  1000   // delayMs between attempts
);
```

## Usage Examples

### Jest E2E Test with All Features

```typescript
import {
  request,
  waitForOrderStatus,
  waitForEventMatching,
  pollingMetrics,
  setTimeoutProfile,
} from '@tiny-store/shared-testing';

describe('Order Tests', () => {
  beforeAll(() => {
    pollingMetrics.enable();
    
    if (process.env.CI === 'true') {
      setTimeoutProfile('ci');
    }
  });

  afterAll(() => {
    const summary = pollingMetrics.getSummary();
    console.log('Metrics:', summary);
  });

  it('should complete order', async () => {
    // Place order
    const orderResponse = await request('POST', '/orders', orderData);
    const orderId = orderResponse.data.orderId;

    // Wait for completion with metrics tracking
    const finalOrder = await waitForOrderStatus(orderId, 'SHIPPED');

    // Verify event with predicate
    const shipmentEvent = await waitForEventMatching(
      (e) => e.eventType === 'OrderShipped' && e.aggregateId === orderId
    );

    expect(finalOrder.status).toBe('SHIPPED');
    expect(shipmentEvent).toBeDefined();
  });
});
```

### Standalone Script

```javascript
// Note: Standalone scripts need to reimplement or copy the utilities
// since they can't import TypeScript modules directly

const { waitUntil, waitForOrderStatus } = require('./path/to/compiled/e2e-helpers.js');

async function test() {
  const order = await waitForOrderStatus('order-123', 'SHIPPED');
  console.log('Order shipped:', order);
}
```

## API Reference

### Types

```typescript
interface TimeoutProfile {
  defaultMaxWait: number;
  defaultPollInterval: number;
  orderTransition: number;
  inventoryUpdate: number;
  eventPropagation: number;
  complexWorkflow: number;
}

interface PollingMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  pollAttempts: number;
  success: boolean;
  error?: string;
}

interface WaitUntilOptions {
  maxWaitMs?: number;
  pollIntervalMs?: number;
  errorMessage?: string;
  operationName?: string;
}

type EventPredicate = (event: any) => boolean;
```

### Functions

- `getTimeoutProfile(): TimeoutProfile` - Get current profile
- `setTimeoutProfile(profile)` - Set timeout profile
- `sleep(ms: number): Promise<void>` - Sleep utility
- `waitUntil<T>(conditionFn, options?): Promise<T>` - Generic polling
- `request<T>(method, path, body?, baseUrl?): Promise<HttpResponse<T>>` - HTTP helper
- `waitForOrderStatus(orderId, status, maxWaitMs?): Promise<any>` - Wait for order
- `waitForInventoryState(sku, state, maxWaitMs?): Promise<any>` - Wait for inventory
- `waitForEvent(orderId, eventType, maxWaitMs?): Promise<any>` - Wait for specific event
- `waitForEventMatching(predicate, options?): Promise<any>` - Wait for event matching predicate
- `waitForEvents(eventTypes[], options?): Promise<any>` - Wait for multiple events
- `retry<T>(fn, maxAttempts?, delayMs?): Promise<T>` - Retry with backoff

### Metrics API

- `pollingMetrics.enable()` - Start tracking
- `pollingMetrics.disable()` - Stop tracking
- `pollingMetrics.getMetrics(): PollingMetrics[]` - Get all metrics
- `pollingMetrics.clear()` - Clear metrics
- `pollingMetrics.getSummary()` - Get aggregated summary

## Best Practices

1. **Use Timeout Profiles**: Let the library handle environment-specific timeouts
2. **Enable Metrics in CI**: Track polling performance in CI for optimization
3. **Use Operation Names**: Name your operations for better metrics breakdown
4. **Leverage Predicates**: Use `waitForEventMatching` for complex event conditions
5. **Retry Non-Deterministic Ops**: Use `retry()` for operations with known failure rates

## Performance Optimization

The metrics feature helps identify slow operations:

```typescript
const summary = pollingMetrics.getSummary();

// Find operations taking too long
Object.entries(summary.operationBreakdown).forEach(([op, data]) => {
  if (data.avgDuration > 1000) {
    console.warn(`Slow operation: ${op} (${data.avgDuration}ms avg)`);
  }
});
```

## Testing

The e2e-helpers library is used in:
- `apps/api/e2e/comprehensive.e2e.spec.ts` - Full Jest test suite
- `test-api.js` - Standalone Node.js tests (reimplements utilities)

Run tests:
```bash
npm run test:e2e:comprehensive  # Jest with all features
npm run test:e2e:standalone     # Standalone script
```

## Migration from test-api.js

To migrate standalone tests to Jest:

1. Import utilities: `import { waitForOrderStatus, ... } from '@tiny-store/shared-testing'`
2. Remove local implementations of polling functions
3. Enable metrics in test setup
4. Set timeout profile based on environment
5. Use operation names for better metrics

See `apps/api/e2e/comprehensive.e2e.spec.ts` for complete examples.

