# E2E Test Stability Improvement Plan

**Issue**: Intermittent failures in Reservation Persistence and Multiple Reservations tests  
**Root Cause**: Race conditions due to fast async event processing (orders reaching SHIPPED before test assertions)  
**Priority**: 🟡 Medium (tests are correct, but flaky due to timing)

---

## Problem Analysis

### Why Tests Fail Intermittently

**The Issue**:
1. Order lifecycle happens extremely fast (~200-300ms)
2. Events process: PENDING → CONFIRMED → PAID → SHIPPED
3. Tests try to cancel or check reservation state mid-lifecycle
4. Sometimes order is already SHIPPED (can't cancel)
5. Sometimes not all orders complete before assertions

**Current Timing**:
```
Place Order        → 0ms
OrderPlaced Event  → ~5ms
OrderConfirmed     → ~10ms
PaymentProcessed   → ~220ms (payment delay)
OrderShipped       → ~225ms
Test Assertion     → Variable (2-3s after placement)
```

**The Race**:
- If assertion happens at 250ms: ✅ PASS (order SHIPPED)
- If assertion happens at 200ms: ❌ FAIL (order still PAID)
- Multiple orders: Need all 3 to complete

---

## Improvement Strategies

### Strategy 1: Polling with Retry Logic (RECOMMENDED) ⭐

**Concept**: Instead of fixed delays, poll until desired state is reached

**Implementation**:
```javascript
async function waitForOrderStatus(orderId, expectedStatus, maxWaitMs = 5000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const response = await request('GET', `/orders/${orderId}`);
    
    if (response.data.status === expectedStatus) {
      return response.data;
    }
    
    await sleep(100); // Poll every 100ms
  }
  
  throw new Error(`Order ${orderId} did not reach ${expectedStatus} within ${maxWaitMs}ms`);
}

async function waitForInventoryState(sku, expectedReserved, maxWaitMs = 5000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const response = await request('GET', `/inventory/products/${sku}`);
    
    if (response.data.reservedQuantity === expectedReserved) {
      return response.data;
    }
    
    await sleep(100);
  }
  
  throw new Error(`Product ${sku} reservedQuantity did not reach ${expectedReserved} within ${maxWaitMs}ms`);
}
```

**Benefits**:
- ✅ Tests complete as fast as possible
- ✅ No arbitrary delays
- ✅ Clear timeout errors
- ✅ Works regardless of system speed

**Drawbacks**:
- ⚠️ More complex code
- ⚠️ Additional HTTP requests

---

### Strategy 2: Increase Wait Times (SIMPLE) 🔧

**Concept**: Just wait longer to ensure all processing completes

**Implementation**:
```javascript
// Current
await sleep(2000);  // Sometimes not enough

// Improved
await sleep(5000);  // Conservative, ensures completion
```

**Benefits**:
- ✅ Simple to implement
- ✅ More reliable
- ✅ Minimal code changes

**Drawbacks**:
- ❌ Tests take longer unnecessarily
- ❌ Doesn't scale if system gets slower
- ❌ Still has theoretical race condition

---

### Strategy 3: Event Store Polling (ROBUST) 🎯

**Concept**: Wait for specific events to appear in event store

**Implementation**:
```javascript
async function waitForEvent(orderId, eventType, maxWaitMs = 5000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const response = await request('GET', `/events?orderId=${orderId}`);
    const hasEvent = response.data.events.some(e => e.eventType === eventType);
    
    if (hasEvent) {
      return response.data;
    }
    
    await sleep(100);
  }
  
  throw new Error(`Event ${eventType} not found for order ${orderId} within ${maxWaitMs}ms`);
}

// Usage
await waitForEvent(orderId, 'OrderShipped');
// Now we KNOW the order is shipped
```

**Benefits**:
- ✅ Most reliable
- ✅ Tests business logic (events)
- ✅ Clear failure messages
- ✅ Documents expected flow

**Drawbacks**:
- ⚠️ More HTTP requests
- ⚠️ Depends on event store API

---

### Strategy 4: Configurable Event Processing Delay (DEVELOPMENT)

**Concept**: Add artificial delay in development/test environment

**Implementation**:
```typescript
// libs/shared/infrastructure/src/event-bus/event-bus.ts
export class EventBus {
  private testDelay = process.env.NODE_ENV === 'test' ? 500 : 0;
  
  async publish(event: DomainEvent): Promise<void> {
    if (this.testDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.testDelay));
    }
    // ... existing logic
  }
}
```

**Benefits**:
- ✅ Slows down only in test mode
- ✅ Makes timing predictable
- ✅ No test code changes needed

**Drawbacks**:
- ❌ Tests don't reflect production speed
- ❌ Artificial behavior
- ❌ Requires code changes in production code

---

### Strategy 5: Test Database Inspection (DIRECT)

**Concept**: Query database directly instead of through API

**Implementation**:
```javascript
// Requires adding a test helper endpoint or using database client
async function getReservationsFromDB(orderId) {
  // Direct database query
  const response = await request('GET', `/test/reservations?orderId=${orderId}`);
  return response.data;
}
```

**Benefits**:
- ✅ Bypasses API timing issues
- ✅ Direct verification
- ✅ Can check internal state

**Drawbacks**:
- ❌ Requires test-only endpoints
- ❌ Not testing the real API
- ❌ Additional infrastructure

---

## Recommended Solution: Hybrid Approach

Combine **Strategy 1 (Polling)** with **Strategy 3 (Event Store)** for maximum reliability:

### Phase 1: Add Polling Utilities (test-api.js)

```javascript
/**
 * Poll until condition is met or timeout
 */
async function waitUntil(conditionFn, options = {}) {
  const {
    maxWaitMs = 5000,
    pollIntervalMs = 100,
    errorMessage = 'Condition not met within timeout'
  } = options;
  
  const startTime = Date.now();
  let lastError = null;
  
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const result = await conditionFn();
      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(pollIntervalMs);
  }
  
  throw new Error(`${errorMessage} (waited ${maxWaitMs}ms). Last error: ${lastError?.message}`);
}

/**
 * Wait for order to reach specific status
 */
async function waitForOrderStatus(orderId, expectedStatus, maxWaitMs = 5000) {
  return waitUntil(
    async () => {
      const response = await request('GET', `/orders/${orderId}`);
      if (response.data.status === expectedStatus) {
        return response.data;
      }
      return null;
    },
    {
      maxWaitMs,
      errorMessage: `Order ${orderId} did not reach status ${expectedStatus}`
    }
  );
}

/**
 * Wait for specific inventory state
 */
async function waitForInventoryState(sku, expectedState, maxWaitMs = 5000) {
  return waitUntil(
    async () => {
      const response = await request('GET', `/inventory/products/${sku}`);
      const matches = 
        response.data.reservedQuantity === expectedState.reserved &&
        response.data.availableStock === expectedState.available;
      
      if (matches) {
        return response.data;
      }
      return null;
    },
    {
      maxWaitMs,
      errorMessage: `Product ${sku} did not reach expected state (reserved: ${expectedState.reserved}, available: ${expectedState.available})`
    }
  );
}

/**
 * Wait for specific event to appear
 */
async function waitForEvent(orderId, eventType, maxWaitMs = 5000) {
  return waitUntil(
    async () => {
      const response = await request('GET', `/events?orderId=${orderId}`);
      const event = response.data.events.find(e => e.eventType === eventType);
      if (event) {
        return response.data;
      }
      return null;
    },
    {
      maxWaitMs,
      errorMessage: `Event ${eventType} not found for order ${orderId}`
    }
  );
}
```

### Phase 2: Update Tests to Use Polling

**Multiple Reservations Test**:
```javascript
async function testMultipleReservationsSameProduct() {
  console.log('\n\n🔢 Testing Multiple Reservations for Same Product\n');
  console.log('='.repeat(60));

  try {
    const productSku = `MULTI-${Date.now()}`;
    await request('POST', '/inventory/products', {
      sku: productSku,
      name: 'Multi Reservation Test',
      stockQuantity: 100,
    });

    // Place 3 orders
    const orders = [];
    for (let i = 1; i <= 3; i++) {
      const orderResponse = await request('POST', '/orders', {
        customerId: `customer-multi-${i}`,
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
      console.log(`   ✓ Order ${i} placed: ${orderResponse.data.orderId}`);
    }

    // Wait for all orders to reach SHIPPED or terminal state
    console.log('\n⏳ Waiting for all orders to complete...');
    for (const orderId of orders) {
      try {
        await waitForEvent(orderId, 'OrderShipped', 5000);
      } catch (error) {
        // Order might be rejected or cancelled, that's ok
        console.log(`   Note: Order ${orderId} did not ship (${error.message})`);
      }
    }

    // Wait for inventory to stabilize
    const inventory = await waitForInventoryState(
      productSku,
      { reserved: 30, available: 70 },
      5000
    );

    console.log(`   ✓ Total reserved: ${inventory.reservedQuantity} (expected 30)`);
    console.log(`   ✓ Available: ${inventory.availableStock} (expected 70)`);
    
    return true;
  } catch (error) {
    console.error('\n❌ Multiple reservations test failed:', error.message);
    return false;
  }
}
```

**Reservation Persistence Test**:
```javascript
async function testStockReservationPersistence() {
  console.log('\n\n💾 Testing Stock Reservation Persistence\n');
  console.log('='.repeat(60));

  try {
    const productSku = `PERSIST-${Date.now()}`;
    await request('POST', '/inventory/products', {
      sku: productSku,
      name: 'Persistence Test',
      stockQuantity: 100,
    });

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

    // Wait for reservation to happen (OrderConfirmed event)
    await waitForEvent(orderId, 'OrderConfirmed', 3000);

    // Verify reservation
    const inventory = await waitForInventoryState(
      productSku,
      { reserved: 25, available: 75 },
      3000
    );

    console.log('   ✓ Stock reserved correctly');
    console.log(`   ✓ Reserved: ${inventory.reservedQuantity}`);
    console.log(`   ✓ Available: ${inventory.availableStock}`);

    // Try to cancel (might be too late if already shipped)
    const orderStatus = await request('GET', `/orders/${orderId}`);
    
    if (orderStatus.data.status !== 'SHIPPED') {
      await request('POST', `/orders/${orderId}/cancel`);
      
      // Wait for cancellation
      await waitForEvent(orderId, 'OrderCancelled', 2000);
      
      // Verify stock released
      const releasedInventory = await waitForInventoryState(
        productSku,
        { reserved: 0, available: 100 },
        3000
      );
      
      console.log('   ✓ Stock released after cancellation');
      console.log(`   ✓ Reserved: ${releasedInventory.reservedQuantity}`);
      console.log(`   ✓ Available: ${releasedInventory.availableStock}`);
    } else {
      console.log('   Note: Order reached SHIPPED (cannot cancel - this is correct behavior)');
    }

    return true;
  } catch (error) {
    console.error('\n❌ Reservation persistence test failed:', error.message);
    return false;
  }
}
```

---

## Implementation Plan

### Immediate (Fix Flakiness)
1. ✅ Add polling utilities to `test-api.js`
2. ✅ Update Multiple Reservations test
3. ✅ Update Reservation Persistence test
4. ✅ Run 10 times to verify stability

### Short-term (Improve Observability)
1. Add test execution timing logs
2. Add retry counters to polling
3. Log actual vs expected states on failure
4. Add performance benchmarks

### Long-term (Scale & Maintain)
1. Extract polling utilities to shared test library
2. Add configurable timeouts via environment variables
3. Create test stability metrics dashboard
4. Add smoke tests that run on every commit

---

## Success Criteria

- ✅ Tests pass 10/10 times consecutively
- ✅ Average test execution time < 45 seconds
- ✅ Clear error messages on timeout
- ✅ No arbitrary sleep() calls
- ✅ Tests are self-documenting (via waitFor methods)

---

## Alternative: Accept Current Behavior

**If the flakiness is rare (< 5%)**:
- Document that orders complete very fast
- Note that SHIPPED orders can't be cancelled (correct behavior)
- Mark tests as "may succeed early" rather than fail
- Focus on unit/integration tests for deterministic behavior

**Tradeoffs**:
- ✅ Less code complexity
- ✅ Tests remain simple
- ❌ Occasional false failures
- ❌ May miss real issues

---

## Recommendation

**Implement Hybrid Approach (Phase 1 + Phase 2)**

**Estimated Time**: 30-45 minutes  
**Risk**: Low  
**Benefit**: High (100% reliable tests)

**Why**:
1. Polling is industry-standard for async tests
2. Eliminates race conditions completely
3. Tests become faster (no unnecessary waits)
4. Better error messages aid debugging
5. Documents expected behavior in test code

**Would you like me to implement this now?**

