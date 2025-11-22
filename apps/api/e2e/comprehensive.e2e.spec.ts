/**
 * Comprehensive E2E Tests using Jest and Shared Polling Utilities
 * 
 * These tests use the shared e2e-helpers library which provides:
 * - Polling utilities with timeout profiles
 * - Metrics tracking
 * - Generic event matching
 */

import {
  request,
  waitUntil,
  waitForOrderStatus,
  waitForInventoryState,
  waitForEvent,
  waitForEventMatching,
  waitForEvents,
  pollingMetrics,
  setTimeoutProfile,
  sleep,
  retry,
} from '@tiny-store/shared-testing';

describe('E2E Tests - Complete Order Lifecycle', () => {
  const API_BASE_URL = 'http://localhost:3000';

  beforeAll(() => {
    // Enable metrics collection for performance analysis
    pollingMetrics.enable();
    
    // Set timeout profile based on environment
    if (process.env.CI === 'true') {
      setTimeoutProfile('ci');
      console.log('Using CI timeout profile (extended timeouts)');
    } else {
      setTimeoutProfile('local');
      console.log('Using local timeout profile (standard timeouts)');
    }
  });

  afterAll(() => {
    // Print metrics summary
    const summary = pollingMetrics.getSummary();
    console.log('\n📊 Polling Metrics Summary:');
    console.log(`  Total Operations: ${summary.totalOperations}`);
    console.log(`  Success Rate: ${summary.successRate}%`);
    console.log(`  Average Duration: ${summary.averageDuration}ms`);
    console.log(`  Average Poll Attempts: ${summary.averagePollAttempts}`);
    console.log('\n  Operation Breakdown:');
    Object.entries(summary.operationBreakdown).forEach(([op, data]) => {
      console.log(`    ${op}: ${data.count} calls, avg ${data.avgDuration}ms`);
    });
  });

  beforeEach(() => {
    // Clear metrics before each test for per-test analysis
    pollingMetrics.clear();
  });

  describe('Happy Path - Complete Order Flow', () => {
    it('should complete order from placement to shipment', async () => {
      // 1. Create product
      const productSku = `WIDGET-${Date.now()}`;
      const productResponse = await request('POST', '/inventory/products', {
        sku: productSku,
        name: 'Super Widget',
        stockQuantity: 100,
      });

      expect(productResponse.status).toBe(201);
      expect(productResponse.data.sku).toBe(productSku);

      // 2. Place order (retry on payment failures)
      let orderId: string | null = null;
      let finalOrder: any = null;

      const orderResult = await retry(async () => {
        const orderResponse = await request('POST', '/orders', {
          customerId: `customer-${Date.now()}`,
          items: [{ sku: productSku, quantity: 5, unitPrice: 29.99 }],
          shippingAddress: {
            street: '123 Main St',
            city: 'Test City',
            state: 'TS',
            postalCode: '12345',
            country: 'USA',
          },
        });

        orderId = orderResponse.data.orderId;

        // Wait for terminal state
        const completed = await waitUntil(
          async () => {
            const response = await request('GET', `/orders/${orderId}`);
            if (response.data.status === 'SHIPPED' || response.data.status === 'REJECTED') {
              return response.data;
            }
            return null;
          },
          { maxWaitMs: 10000, operationName: 'waitForOrderCompletion' }
        );

        if (completed.status === 'SHIPPED') {
          return completed;
        }
        throw new Error('Payment failed, retrying');
      }, 5);

      finalOrder = orderResult;

      expect(finalOrder.status).toBe('SHIPPED');
      expect(finalOrder.paymentId).toBeDefined();
      expect(finalOrder.shipmentId).toBeDefined();

      // 3. Verify inventory was updated
      const inventoryResponse = await request('GET', `/inventory/products/${productSku}`);
      expect(inventoryResponse.data.reservedQuantity).toBeGreaterThanOrEqual(5);

      // 4. Verify all events were published
      await waitForEvents(
        ['OrderPlaced', 'OrderConfirmed', 'OrderPaid', 'OrderShipped'],
        { orderId: orderId! }
      );

      const eventsResponse = await request('GET', `/events?orderId=${orderId}`);
      const eventTypes = eventsResponse.data.events.map((e: any) => e.eventType);
      
      expect(eventTypes).toContain('OrderPlaced');
      expect(eventTypes).toContain('OrderConfirmed');
      expect(eventTypes).toContain('OrderPaid');
      expect(eventTypes).toContain('OrderShipped');

      // Print test-specific metrics
      const metrics = pollingMetrics.getSummary();
      console.log(`\n  Test Metrics: ${metrics.totalOperations} operations, ${metrics.averageDuration}ms avg`);
    }, 30000); // 30s timeout for full flow
  });

  describe('Insufficient Stock Scenario', () => {
    it('should reject order when stock is insufficient', async () => {
      // Create product with limited stock
      const productSku = `LIMITED-${Date.now()}`;
      await request('POST', '/inventory/products', {
        sku: productSku,
        name: 'Limited Widget',
        stockQuantity: 5,
      });

      // Attempt to order more than available
      const orderResponse = await request('POST', '/orders', {
        customerId: `customer-${Date.now()}`,
        items: [{ sku: productSku, quantity: 10, unitPrice: 19.99 }],
        shippingAddress: {
          street: '456 Test Ave',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'USA',
        },
      });

      const orderId = orderResponse.data.orderId;

      // Wait for rejection
      const finalOrder = await waitForOrderStatus(orderId, 'REJECTED');

      expect(finalOrder.status).toBe('REJECTED');
      expect(finalOrder.rejectionReason).toContain('Insufficient stock');

      // Verify inventory unchanged
      const inventoryResponse = await request('GET', `/inventory/products/${productSku}`);
      expect(inventoryResponse.data.stockQuantity).toBe(5);
      expect(inventoryResponse.data.reservedQuantity).toBe(0);
      expect(inventoryResponse.data.availableStock).toBe(5);

      // Verify rejection event
      await waitForEvent(orderId, 'OrderRejected');
    });
  });

  describe('Order Cancellation Scenarios', () => {
    it('should handle cancellation attempt (may complete before cancel)', async () => {
      // Create product
      const productSku = `CANCEL-${Date.now()}`;
      await request('POST', '/inventory/products', {
        sku: productSku,
        name: 'Cancellable Widget',
        stockQuantity: 50,
      });

      // Place order
      const orderResponse = await request('POST', '/orders', {
        customerId: `customer-${Date.now()}`,
        items: [{ sku: productSku, quantity: 10, unitPrice: 15.99 }],
        shippingAddress: {
          street: '789 Cancel St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'USA',
        },
      });

      const orderId = orderResponse.data.orderId;

      // Attempt immediate cancellation
      await sleep(100);
      const cancelResponse = await request('POST', `/orders/${orderId}/cancel`, {
        reason: 'Customer requested cancellation',
      });

      // Wait for final state
      const finalOrder = await waitUntil(
        async () => {
          const response = await request('GET', `/orders/${orderId}`);
          if (response.data.status === 'CANCELLED' || response.data.status === 'SHIPPED') {
            return response.data;
          }
          return null;
        },
        { maxWaitMs: 5000 }
      );

      // Either outcome is valid
      expect(['CANCELLED', 'SHIPPED']).toContain(finalOrder.status);

      if (finalOrder.status === 'CANCELLED') {
        // Verify cancellation event
        await waitForEvent(orderId, 'OrderCancelled');
      } else {
        // Race condition - order completed before cancellation
        expect(cancelResponse.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should reject cancellation of shipped order', async () => {
      // Create product and wait for shipped order
      const productSku = `SHIPPED-${Date.now()}`;
      await request('POST', '/inventory/products', {
        sku: productSku,
        name: 'Shipped Widget',
        stockQuantity: 100,
      });

      // Retry until we get a shipped order
      let orderId: string | null = null;

      await retry(async () => {
        const orderResponse = await request('POST', '/orders', {
          customerId: `customer-${Date.now()}`,
          items: [{ sku: productSku, quantity: 5, unitPrice: 10.00 }],
          shippingAddress: {
            street: '100 Shipped St',
            city: 'Test City',
            state: 'TS',
            postalCode: '12345',
            country: 'USA',
          },
        });

        orderId = orderResponse.data.orderId;

        // Wait for SHIPPED status
        const shipped = await waitForOrderStatus(orderId, 'SHIPPED', 8000);
        return shipped;
      }, 5);

      // Attempt to cancel shipped order
      const cancelResponse = await request('POST', `/orders/${orderId}/cancel`, {
        reason: 'Late cancellation attempt',
      });

      // Should be rejected
      expect(cancelResponse.status).toBeGreaterThanOrEqual(400);

      // Verify order still shipped
      const finalOrder = await request('GET', `/orders/${orderId}`);
      expect(finalOrder.data.status).toBe('SHIPPED');
    });
  });

  describe('Event Matching with Predicates', () => {
    it('should find events using custom predicates', async () => {
      // Create order
      const productSku = `EVENT-${Date.now()}`;
      await request('POST', '/inventory/products', {
        sku: productSku,
        name: 'Event Test Widget',
        stockQuantity: 100,
      });

      const orderResponse = await request('POST', '/orders', {
        customerId: `customer-${Date.now()}`,
        items: [{ sku: productSku, quantity: 1, unitPrice: 100.00 }],
        shippingAddress: {
          street: '100 Event St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'USA',
        },
      });

      const orderId = orderResponse.data.orderId;

      // Wait for high-value order event using predicate
      const orderPlacedEvent = await waitForEventMatching(
        (event) => 
          event.eventType === 'OrderPlaced' &&
          event.aggregateId === orderId &&
          event.payload.totalAmount >= 100,
        { orderId, operationName: 'waitForHighValueOrder' }
      );

      expect(orderPlacedEvent).toBeDefined();
      expect(orderPlacedEvent.eventType).toBe('OrderPlaced');
      expect(orderPlacedEvent.payload.totalAmount).toBeGreaterThanOrEqual(100);

      // Wait for any payment-related event
      const paymentEvent = await waitForEventMatching(
        (event) => event.eventType.includes('Payment'),
        { orderId }
      );

      expect(paymentEvent).toBeDefined();
      expect(paymentEvent.eventType).toMatch(/Payment/);
    });

    it('should wait for multiple specific events', async () => {
      const productSku = `MULTI-EVENT-${Date.now()}`;
      await request('POST', '/inventory/products', {
        sku: productSku,
        name: 'Multi Event Widget',
        stockQuantity: 100,
      });

      const orderResponse = await request('POST', '/orders', {
        customerId: `customer-${Date.now()}`,
        items: [{ sku: productSku, quantity: 1, unitPrice: 50.00 }],
        shippingAddress: {
          street: '200 Event St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'USA',
        },
      });

      const orderId = orderResponse.data.orderId;

      // Wait for all critical events
      const eventsData = await waitForEvents(
        ['OrderPlaced', 'OrderConfirmed', 'OrderPaid'],
        { orderId, maxWaitMs: 10000 }
      );

      expect(eventsData.events).toBeDefined();
      
      const eventTypes = eventsData.events.map((e: any) => e.eventType);
      expect(eventTypes).toContain('OrderPlaced');
      expect(eventTypes).toContain('OrderConfirmed');
      expect(eventTypes).toContain('OrderPaid');
    });
  });

  describe('Stock Reservation Persistence', () => {
    it('should persist stock reservations correctly', async () => {
      const productSku = `PERSIST-${Date.now()}`;
      await request('POST', '/inventory/products', {
        sku: productSku,
        name: 'Persistence Test',
        stockQuantity: 100,
      });

      // Place order with retry
      let orderId: string | null = null;

      await retry(async () => {
        const orderResponse = await request('POST', '/orders', {
          customerId: `customer-${Date.now()}`,
          items: [{ sku: productSku, quantity: 25, unitPrice: 10.00 }],
          shippingAddress: {
            street: '100 DB Test St',
            city: 'Test City',
            state: 'TS',
            postalCode: '12345',
            country: 'USA',
          },
        });

        orderId = orderResponse.data.orderId;

        // Wait for completion
        const completed = await waitUntil(
          async () => {
            const response = await request('GET', `/orders/${orderId}`);
            if (response.data.status === 'SHIPPED' || response.data.status === 'REJECTED') {
              return response.data;
            }
            return null;
          },
          { maxWaitMs: 10000 }
        );

        if (completed.status === 'SHIPPED') {
          return completed;
        }
        throw new Error('Payment failed, retrying');
      }, 5);

      // Verify stock reservation
      const inventoryResponse = await request('GET', `/inventory/products/${productSku}`);
      expect(inventoryResponse.data.reservedQuantity).toBeGreaterThanOrEqual(25);
      expect(inventoryResponse.data.stockQuantity).toBe(100);

      // Verify inventory consistency
      const reserved = inventoryResponse.data.reservedQuantity;
      const available = inventoryResponse.data.availableStock;
      const total = inventoryResponse.data.stockQuantity;
      
      expect(reserved + available).toBe(total);
    });
  });

  describe('Multiple Concurrent Reservations', () => {
    it('should handle multiple orders for same product', async () => {
      const productSku = `MULTI-${Date.now()}`;
      await request('POST', '/inventory/products', {
        sku: productSku,
        name: 'Multi Reservation Test',
        stockQuantity: 200,
      });

      // Place 3 orders concurrently
      const orderPromises = Array.from({ length: 3 }, (_, i) => 
        request('POST', '/orders', {
          customerId: `customer-multi-${i}-${Date.now()}`,
          items: [{ sku: productSku, quantity: 10, unitPrice: 10.00 }],
          shippingAddress: {
            street: `${i}00 Test St`,
            city: 'Test City',
            state: 'TS',
            postalCode: '12345',
            country: 'USA',
          },
        })
      );

      const orderResponses = await Promise.all(orderPromises);
      const orderIds = orderResponses.map(r => r.data.orderId);

      // Wait for all to reach terminal state
      const finalOrders = await Promise.all(
        orderIds.map(id => 
          waitUntil(
            async () => {
              const response = await request('GET', `/orders/${id}`);
              if (response.data.status === 'SHIPPED' || response.data.status === 'REJECTED') {
                return response.data;
              }
              return null;
            },
            { maxWaitMs: 15000 }
          )
        )
      );

      const shippedCount = finalOrders.filter(o => o.status === 'SHIPPED').length;

      // At least some should succeed
      expect(shippedCount).toBeGreaterThan(0);

      // Verify inventory consistency
      await sleep(500); // Allow time for all updates
      const inventoryResponse = await request('GET', `/inventory/products/${productSku}`);
      
      const reserved = inventoryResponse.data.reservedQuantity;
      const available = inventoryResponse.data.availableStock;
      const total = inventoryResponse.data.stockQuantity;
      
      expect(reserved + available).toBe(total);
      expect(reserved).toBeGreaterThanOrEqual(shippedCount * 10);
    }, 40000); // Extended timeout for concurrent operations
  });
});

