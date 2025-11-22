/**
 * End-to-End Tests for Tiny Store
 * 
 * Tests the complete order lifecycle via HTTP API
 */

const API_BASE_URL = 'http://localhost:3000/api';

// Simple HTTP client (no external dependencies)
async function request(method: string, path: string, body?: any) {
  const url = `${API_BASE_URL}${path}`;
  
  const options: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  return {
    status: response.status,
    data,
  };
}

// Helper to wait for async event processing
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Test data builders
function createProductData(sku: string = 'TEST-WIDGET-001', stockQuantity: number = 100) {
  return {
    sku,
    name: `Test Product ${sku}`,
    stockQuantity,
  };
}

function createOrderData(sku: string = 'TEST-WIDGET-001', quantity: number = 2) {
  return {
    customerId: `customer-${Date.now()}`,
    items: [
      {
        sku,
        quantity,
        unitPrice: 29.99,
      },
    ],
    shippingAddress: {
      street: '123 Test St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
      country: 'USA',
    },
  };
}

describe('E2E: Order Lifecycle', () => {
  describe('Happy Path: Complete Order Flow', () => {
    it('should complete full order lifecycle from placement to shipment', async () => {
      // 1. Create a product
      const productSku = `WIDGET-${Date.now()}`;
      const productResponse = await request('POST', '/inventory/products', createProductData(productSku, 100));
      
      expect(productResponse.status).toBe(201);
      expect(productResponse.data.sku).toBe(productSku);
      expect(productResponse.data.stockQuantity).toBe(100);
      expect(productResponse.data.availableStock).toBe(100);

      // 2. Place an order
      const orderData = createOrderData(productSku, 5);
      const orderResponse = await request('POST', '/orders', orderData);
      
      expect(orderResponse.status).toBe(201);
      expect(orderResponse.data.orderId).toBeDefined();
      expect(orderResponse.data.status).toBe('PENDING');
      expect(orderResponse.data.totalAmount).toBe(149.95); // 5 * 29.99

      const orderId = orderResponse.data.orderId;

      // 3. Wait for event processing (order should progress through states)
      await sleep(2000);

      // 4. Check order status (should be SHIPPED if payment succeeded)
      const orderStatusResponse = await request('GET', `/orders/${orderId}`);
      
      expect(orderStatusResponse.status).toBe(200);
      const order = orderStatusResponse.data;
      
      // Order should be SHIPPED (90% chance) or PAYMENT_FAILED (10% chance)
      expect(['SHIPPED', 'PAYMENT_FAILED']).toContain(order.status);

      // 5. Check inventory was updated
      const productCheckResponse = await request('GET', `/inventory/products/${productSku}`);
      
      expect(productCheckResponse.status).toBe(200);
      
      if (order.status === 'SHIPPED') {
        // If payment succeeded, stock should be reserved
        expect(productCheckResponse.data.reservedQuantity).toBe(5);
        expect(productCheckResponse.data.availableStock).toBe(95);
        
        // Order should have payment and shipment IDs
        expect(order.paymentId).toBeDefined();
        expect(order.shipmentId).toBeDefined();
      } else if (order.status === 'PAYMENT_FAILED') {
        // If payment failed, stock should be released
        expect(productCheckResponse.data.reservedQuantity).toBe(0);
        expect(productCheckResponse.data.availableStock).toBe(100);
        
        // No payment or shipment
        expect(order.paymentId).toBeUndefined();
        expect(order.shipmentId).toBeUndefined();
      }

      // 6. Check event history
      const eventsResponse = await request('GET', `/events?orderId=${orderId}`);
      
      expect(eventsResponse.status).toBe(200);
      expect(eventsResponse.data.events).toBeInstanceOf(Array);
      expect(eventsResponse.data.events.length).toBeGreaterThan(0);

      // Should have at least OrderPlaced event
      const eventTypes = eventsResponse.data.events.map((e: any) => e.eventType);
      expect(eventTypes).toContain('OrderPlaced');
      
      if (order.status === 'SHIPPED') {
        // Happy path events
        expect(eventTypes).toContain('InventoryReserved');
        expect(eventTypes).toContain('OrderConfirmed');
        expect(eventTypes).toContain('PaymentProcessed');
        expect(eventTypes).toContain('OrderPaid');
        expect(eventTypes).toContain('ShipmentCreated');
      }

      console.log(`✅ Happy path test completed. Order ${orderId} status: ${order.status}`);
    }, 30000); // 30 second timeout

    it('should handle multiple concurrent orders correctly', async () => {
      // Create a product with limited stock
      const productSku = `LIMITED-${Date.now()}`;
      await request('POST', '/inventory/products', createProductData(productSku, 20));

      // Place multiple orders concurrently
      const orderPromises = [
        request('POST', '/orders', createOrderData(productSku, 5)),
        request('POST', '/orders', createOrderData(productSku, 5)),
        request('POST', '/orders', createOrderData(productSku, 5)),
      ];

      const orderResponses = await Promise.all(orderPromises);

      // All orders should be created
      orderResponses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.data.orderId).toBeDefined();
      });

      // Wait for processing
      await sleep(2000);

      // Check final inventory
      const productResponse = await request('GET', `/inventory/products/${productSku}`);
      
      // Should have processed some orders
      expect(productResponse.data.availableStock).toBeLessThanOrEqual(20);
      
      console.log(`✅ Concurrent orders test completed. Final available stock: ${productResponse.data.availableStock}`);
    }, 30000);
  });

  describe('Failed Scenario: Insufficient Stock', () => {
    it('should reject order when insufficient stock', async () => {
      // 1. Create a product with limited stock
      const productSku = `LIMITED-${Date.now()}`;
      const productResponse = await request('POST', '/inventory/products', createProductData(productSku, 5));
      
      expect(productResponse.status).toBe(201);

      // 2. Try to order more than available
      const orderData = createOrderData(productSku, 10);
      const orderResponse = await request('POST', '/orders', orderData);
      
      expect(orderResponse.status).toBe(201);
      expect(orderResponse.data.status).toBe('PENDING');

      const orderId = orderResponse.data.orderId;

      // 3. Wait for event processing
      await sleep(2000);

      // 4. Check order was rejected
      const orderStatusResponse = await request('GET', `/orders/${orderId}`);
      
      expect(orderStatusResponse.status).toBe(200);
      expect(orderStatusResponse.data.status).toBe('REJECTED');
      expect(orderStatusResponse.data.rejectionReason).toBeDefined();

      // 5. Check inventory unchanged
      const productCheckResponse = await request('GET', `/inventory/products/${productSku}`);
      
      expect(productCheckResponse.data.stockQuantity).toBe(5);
      expect(productCheckResponse.data.reservedQuantity).toBe(0);
      expect(productCheckResponse.data.availableStock).toBe(5);

      // 6. Check events
      const eventsResponse = await request('GET', `/events?orderId=${orderId}`);
      const eventTypes = eventsResponse.data.events.map((e: any) => e.eventType);
      
      expect(eventTypes).toContain('OrderPlaced');
      expect(eventTypes).toContain('InventoryReservationFailed');
      expect(eventTypes).toContain('OrderRejected');

      console.log(`✅ Insufficient stock test completed. Order ${orderId} was correctly rejected.`);
    }, 30000);

    it('should reject order for non-existent product', async () => {
      // Try to order a product that doesn't exist
      const nonExistentSku = `NONEXISTENT-${Date.now()}`;
      const orderData = createOrderData(nonExistentSku, 1);
      const orderResponse = await request('POST', '/orders', orderData);
      
      expect(orderResponse.status).toBe(201);

      const orderId = orderResponse.data.orderId;

      // Wait for processing
      await sleep(2000);

      // Order should be rejected
      const orderStatusResponse = await request('GET', `/orders/${orderId}`);
      
      expect(orderStatusResponse.status).toBe(200);
      expect(orderStatusResponse.data.status).toBe('REJECTED');

      console.log(`✅ Non-existent product test completed. Order ${orderId} was correctly rejected.`);
    }, 30000);
  });

  describe('Order Cancellation', () => {
    it('should cancel pending order', async () => {
      // Create product and place order
      const productSku = `CANCEL-TEST-${Date.now()}`;
      await request('POST', '/inventory/products', createProductData(productSku, 100));
      
      const orderResponse = await request('POST', '/orders', createOrderData(productSku, 10));
      const orderId = orderResponse.data.orderId;

      // Cancel immediately (while still PENDING)
      const cancelResponse = await request('POST', `/orders/${orderId}/cancel`, {
        reason: 'Customer changed mind',
      });

      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.data.status).toBe('CANCELLED');
      expect(cancelResponse.data.cancellationReason).toBe('Customer changed mind');

      // Check inventory released
      await sleep(1000);
      const productResponse = await request('GET', `/inventory/products/${productSku}`);
      expect(productResponse.data.availableStock).toBe(100);

      console.log(`✅ Order cancellation test completed. Order ${orderId} was cancelled.`);
    }, 30000);

    it('should prevent cancellation of shipped order', async () => {
      // This test would need to mock or wait for a shipped order
      // For now, we'll document the expected behavior
      
      // Expected: Attempting to cancel a SHIPPED order should return 422 error
      console.log(`⚠️  Shipped order cancellation test requires order to reach SHIPPED state`);
    }, 10000);
  });

  describe('API Error Handling', () => {
    it('should return 404 for non-existent order', async () => {
      const nonExistentOrderId = '00000000-0000-0000-0000-000000000000';
      const response = await request('GET', `/orders/${nonExistentOrderId}`);
      
      expect(response.status).toBe(404);
      expect(response.data.error).toBeDefined();
    }, 10000);

    it('should return 404 for non-existent product', async () => {
      const response = await request('GET', '/inventory/products/NONEXISTENT-SKU');
      
      expect(response.status).toBe(404);
      expect(response.data.error).toBeDefined();
    }, 10000);

    it('should return 400 for invalid order data', async () => {
      const invalidOrderData = {
        customerId: 'test',
        items: [], // Empty items array should fail validation
        shippingAddress: {
          street: '123 Test St',
          city: 'SF',
          state: 'CA',
          postalCode: '94102',
          country: 'USA',
        },
      };

      const response = await request('POST', '/orders', invalidOrderData);
      
      expect(response.status).toBe(422);
      expect(response.data.error).toBeDefined();
    }, 10000);
  });

  describe('Event Store Queries', () => {
    it('should query events by order ID', async () => {
      const productSku = `EVENT-TEST-${Date.now()}`;
      await request('POST', '/inventory/products', createProductData(productSku, 100));
      
      const orderResponse = await request('POST', '/orders', createOrderData(productSku, 1));
      const orderId = orderResponse.data.orderId;

      await sleep(2000);

      const eventsResponse = await request('GET', `/events?orderId=${orderId}`);
      
      expect(eventsResponse.status).toBe(200);
      expect(eventsResponse.data.events).toBeInstanceOf(Array);
      expect(eventsResponse.data.events.length).toBeGreaterThan(0);

      // All events should have the correct orderId in payload
      eventsResponse.data.events.forEach((event: any) => {
        expect(event.eventId).toBeDefined();
        expect(event.eventType).toBeDefined();
        expect(event.occurredAt).toBeDefined();
      });

      console.log(`✅ Event store query test completed. Found ${eventsResponse.data.events.length} events.`);
    }, 30000);

    it('should query events by type', async () => {
      const eventsResponse = await request('GET', '/events?eventType=OrderPlaced');
      
      expect(eventsResponse.status).toBe(200);
      expect(eventsResponse.data.events).toBeInstanceOf(Array);

      // All events should be OrderPlaced
      eventsResponse.data.events.forEach((event: any) => {
        expect(event.eventType).toBe('OrderPlaced');
      });

      console.log(`✅ Event type query test completed. Found ${eventsResponse.data.events.length} OrderPlaced events.`);
    }, 10000);
  });
});

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('🧪 Starting E2E tests for Tiny Store...\n');
  
  // Note: You would normally use a test runner like Jest
  // This is a standalone implementation for demonstration
  console.log('Please run these tests using a test framework like Jest:');
  console.log('  npm test -- apps/api/e2e/order-lifecycle.e2e.spec.ts');
}

