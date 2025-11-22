/**
 * Performance and Concurrency Tests
 * 
 * These tests verify system behavior under:
 * - Concurrent requests
 * - Race conditions
 * - High load
 * - Performance benchmarks
 */

import * as http from 'http';

async function makeRequest(
  method: string,
  path: string,
  body?: any
): Promise<{ status: number; data: any; duration: number }> {
  const start = Date.now();
  
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;

    const options: http.RequestOptions = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: data
        ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
          }
        : {},
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => (responseBody += chunk));
      res.on('end', () => {
        const duration = Date.now() - start;
        try {
          const parsed = responseBody ? JSON.parse(responseBody) : {};
          resolve({ status: res.statusCode || 500, data: parsed, duration });
        } catch (error) {
          resolve({ status: res.statusCode || 500, data: responseBody, duration });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Performance and Concurrency Tests', () => {
  describe('Response Time Benchmarks', () => {
    it('should respond to health check in under 100ms', async () => {
      const response = await makeRequest('GET', '/api/health');

      expect(response.status).toBe(200);
      expect(response.duration).toBeLessThan(100);
    });

    it('should create product in under 500ms', async () => {
      const productData = {
        sku: `PERF-${Date.now()}`,
        name: 'Performance Test Product',
        price: 50,
        currency: 'USD',
        stockQuantity: 100,
      };

      const response = await makeRequest(
        'POST',
        '/api/inventory/products',
        productData
      );

      expect(response.status).toBe(201);
      expect(response.duration).toBeLessThan(500);
    });

    it('should retrieve product in under 200ms', async () => {
      // Create product first
      const sku = `PERF-GET-${Date.now()}`;
      await makeRequest('POST', '/api/inventory/products', {
        sku,
        name: 'Performance Get Test',
        price: 50,
        currency: 'USD',
        stockQuantity: 100,
      });

      // Measure retrieval time
      const response = await makeRequest(
        'GET',
        `/api/inventory/products/${sku}`
      );

      expect(response.status).toBe(200);
      expect(response.duration).toBeLessThan(200);
    });

    it('should place order in under 500ms', async () => {
      const sku = `PERF-ORDER-${Date.now()}`;
      await makeRequest('POST', '/api/inventory/products', {
        sku,
        name: 'Performance Order Test',
        price: 50,
        currency: 'USD',
        stockQuantity: 100,
      });

      const orderData = {
        customerId: 'perf-customer',
        items: [
          {
            sku,
            quantity: 5,
            unitPrice: 50,
            currency: 'USD',
          },
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'USA',
        },
      };

      const response = await makeRequest('POST', '/api/orders', orderData);

      expect(response.status).toBe(201);
      expect(response.duration).toBeLessThan(500);
    });
  });

  describe('Concurrent Product Creation', () => {
    it('should handle 10 concurrent product creations', async () => {
      const timestamp = Date.now();
      const promises = Array.from({ length: 10 }, (_, i) =>
        makeRequest('POST', '/api/inventory/products', {
          sku: `CONCURRENT-${timestamp}-${i}`,
          name: `Concurrent Product ${i}`,
          price: 50 + i,
          currency: 'USD',
          stockQuantity: 100,
        })
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result.status).toBe(201);
        expect(result.data.productId).toBeDefined();
      });

      // All should have unique product IDs
      const productIds = results.map((r) => r.data.productId);
      const uniqueIds = new Set(productIds);
      expect(uniqueIds.size).toBe(10);
    });

    it('should handle 50 concurrent product retrievals', async () => {
      // Create a product
      const sku = `CONCURRENT-GET-${Date.now()}`;
      await makeRequest('POST', '/api/inventory/products', {
        sku,
        name: 'Concurrent Get Test',
        price: 50,
        currency: 'USD',
        stockQuantity: 100,
      });

      // Retrieve it 50 times concurrently
      const promises = Array.from({ length: 50 }, () =>
        makeRequest('GET', `/api/inventory/products/${sku}`)
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result.status).toBe(200);
        expect(result.data.sku).toBe(sku);
      });
    });
  });

  describe('Concurrent Order Placement', () => {
    it('should handle multiple orders for the same product', async () => {
      const sku = `CONCURRENT-ORDER-${Date.now()}`;
      await makeRequest('POST', '/api/inventory/products', {
        sku,
        name: 'Concurrent Order Test',
        price: 50,
        currency: 'USD',
        stockQuantity: 100,
      });

      // Place 5 orders concurrently
      const orderData = {
        customerId: 'concurrent-customer',
        items: [
          {
            sku,
            quantity: 10,
            unitPrice: 50,
            currency: 'USD',
          },
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'USA',
        },
      };

      const promises = Array.from({ length: 5 }, (_, i) =>
        makeRequest('POST', '/api/orders', {
          ...orderData,
          customerId: `concurrent-customer-${i}`,
        })
      );

      const results = await Promise.all(promises);

      // All should be created (order placement is async validation)
      results.forEach((result) => {
        expect(result.status).toBe(201);
        expect(result.data.orderId).toBeDefined();
      });

      // Wait for event processing
      await wait(500);

      // Verify stock was properly reserved/rejected
      const productResponse = await makeRequest(
        'GET',
        `/api/inventory/products/${sku}`
      );

      expect(productResponse.status).toBe(200);
      // Stock should be affected by successful reservations
      expect(productResponse.data.stockQuantity).toBe(100);
    });
  });

  describe('Race Condition: Stock Reservation', () => {
    it('should not over-reserve stock under concurrent load', async () => {
      const sku = `RACE-CONDITION-${Date.now()}`;
      const initialStock = 50;

      await makeRequest('POST', '/api/inventory/products', {
        sku,
        name: 'Race Condition Test',
        price: 50,
        currency: 'USD',
        stockQuantity: initialStock,
      });

      // Attempt to order more than available stock concurrently
      // Each order requests 30 units, total 60 units requested but only 50 available
      const orderData = {
        items: [
          {
            sku,
            quantity: 30,
            unitPrice: 50,
            currency: 'USD',
          },
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'USA',
        },
      };

      const promises = [
        makeRequest('POST', '/api/orders', {
          ...orderData,
          customerId: 'race-customer-1',
        }),
        makeRequest('POST', '/api/orders', {
          ...orderData,
          customerId: 'race-customer-2',
        }),
      ];

      const results = await Promise.all(promises);

      // Both orders should be placed initially
      expect(results[0].status).toBe(201);
      expect(results[1].status).toBe(201);

      const order1Id = results[0].data.orderId;
      const order2Id = results[1].data.orderId;

      // Wait for event processing
      await wait(500);

      // Check final order statuses
      const order1 = await makeRequest('GET', `/api/orders/${order1Id}`);
      const order2 = await makeRequest('GET', `/api/orders/${order2Id}`);

      // At least one order should be rejected due to insufficient stock
      const statuses = [order1.data.status, order2.data.status];
      expect(statuses).toContain('REJECTED');

      // Verify final stock state
      const product = await makeRequest('GET', `/api/inventory/products/${sku}`);

      // Total reserved + available should not exceed initial stock
      const totalAccounted =
        product.data.reservedQuantity + product.data.availableStock;
      expect(totalAccounted).toBeLessThanOrEqual(initialStock);
    });
  });

  describe('High Load Scenarios', () => {
    it('should handle burst of 20 product creations', async () => {
      const timestamp = Date.now();
      const promises = Array.from({ length: 20 }, (_, i) =>
        makeRequest('POST', '/api/inventory/products', {
          sku: `BURST-${timestamp}-${i}`,
          name: `Burst Product ${i}`,
          price: 50,
          currency: 'USD',
          stockQuantity: 100,
        })
      );

      const start = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      // All should succeed
      const successCount = results.filter((r) => r.status === 201).length;
      expect(successCount).toBe(20);

      // Should complete in reasonable time (< 5 seconds for 20 requests)
      expect(duration).toBeLessThan(5000);

      console.log(`20 concurrent product creations took ${duration}ms`);
    });

    it('should handle mixed read/write operations', async () => {
      const sku = `MIXED-OPS-${Date.now()}`;

      // Create initial product
      await makeRequest('POST', '/api/inventory/products', {
        sku,
        name: 'Mixed Operations Test',
        price: 50,
        currency: 'USD',
        stockQuantity: 100,
      });

      // Mix of reads and writes
      const operations = [
        ...Array.from({ length: 10 }, () =>
          makeRequest('GET', `/api/inventory/products/${sku}`)
        ),
        ...Array.from({ length: 5 }, (_, i) =>
          makeRequest('PATCH', `/api/inventory/products/${sku}`, {
            stockQuantity: 100 + i * 10,
          })
        ),
        ...Array.from({ length: 10 }, () =>
          makeRequest('GET', `/api/inventory/products/${sku}`)
        ),
      ];

      const results = await Promise.all(operations);

      // Most should succeed (some writes might conflict)
      const successCount = results.filter((r) => r.status === 200).length;
      expect(successCount).toBeGreaterThan(15);
    });
  });

  describe('Event Processing Performance', () => {
    it('should process order events within reasonable time', async () => {
      const sku = `EVENT-PERF-${Date.now()}`;
      await makeRequest('POST', '/api/inventory/products', {
        sku,
        name: 'Event Performance Test',
        price: 50,
        currency: 'USD',
        stockQuantity: 100,
      });

      const orderData = {
        customerId: 'event-perf-customer',
        items: [
          {
            sku,
            quantity: 5,
            unitPrice: 50,
            currency: 'USD',
          },
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'USA',
        },
      };

      const startTime = Date.now();
      const orderResponse = await makeRequest('POST', '/api/orders', orderData);
      const orderId = orderResponse.data.orderId;

      // Wait for events to process
      await wait(1000);

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Check final order state
      const finalOrder = await makeRequest('GET', `/api/orders/${orderId}`);

      // Order should have progressed beyond PENDING
      expect(finalOrder.data.status).not.toBe('PENDING');

      // Total processing time should be reasonable (< 2 seconds)
      expect(totalDuration).toBeLessThan(2000);

      console.log(`Order event processing took ${totalDuration}ms`);
    });

    it('should handle rapid event publishing', async () => {
      // This test would verify the event bus can handle many events
      // In a real scenario, we'd directly test the event bus
      // For now, we'll create multiple orders rapidly

      const sku = `RAPID-EVENTS-${Date.now()}`;
      await makeRequest('POST', '/api/inventory/products', {
        sku,
        name: 'Rapid Events Test',
        price: 50,
        currency: 'USD',
        stockQuantity: 1000,
      });

      const orderPromises = Array.from({ length: 10 }, (_, i) =>
        makeRequest('POST', '/api/orders', {
          customerId: `rapid-customer-${i}`,
          items: [
            {
              sku,
              quantity: 5,
              unitPrice: 50,
              currency: 'USD',
            },
          ],
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            postalCode: '12345',
            country: 'USA',
          },
        })
      );

      const results = await Promise.all(orderPromises);

      // All orders should be placed
      expect(results.every((r) => r.status === 201)).toBe(true);

      // Wait for all events to process
      await wait(1500);

      // Verify system is still responsive
      const healthCheck = await makeRequest('GET', '/api/health');
      expect(healthCheck.status).toBe(200);
    });
  });

  describe('Database Performance', () => {
    it('should handle large order list queries efficiently', async () => {
      const start = Date.now();
      const response = await makeRequest('GET', '/api/orders');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // Should respond quickly even with many orders
      expect(duration).toBeLessThan(1000);

      console.log(`List orders query took ${duration}ms for ${response.data.length} orders`);
    });

    it('should handle event store queries efficiently', async () => {
      const start = Date.now();
      const response = await makeRequest('GET', '/api/events');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);

      // Should respond quickly even with many events
      expect(duration).toBeLessThan(1000);

      console.log(`Event store query took ${duration}ms for ${response.data.length} events`);
    });
  });

  describe('Stress Test Summary', () => {
    it('should maintain system stability under combined load', async () => {
      const sku = `STRESS-TEST-${Date.now()}`;
      
      // Create product
      await makeRequest('POST', '/api/inventory/products', {
        sku,
        name: 'Stress Test Product',
        price: 50,
        currency: 'USD',
        stockQuantity: 500,
      });

      // Simulate real-world mixed traffic
      const operations = [
        // 10 new orders
        ...Array.from({ length: 10 }, (_, i) =>
          makeRequest('POST', '/api/orders', {
            customerId: `stress-customer-${i}`,
            items: [
              {
                sku,
                quantity: 3,
                unitPrice: 50,
                currency: 'USD',
              },
            ],
            shippingAddress: {
              street: '123 Test St',
              city: 'Test City',
              state: 'TS',
              postalCode: '12345',
              country: 'USA',
            },
          })
        ),
        // 20 product reads
        ...Array.from({ length: 20 }, () =>
          makeRequest('GET', `/api/inventory/products/${sku}`)
        ),
        // 10 order list queries
        ...Array.from({ length: 10 }, () =>
          makeRequest('GET', '/api/orders')
        ),
        // 5 event queries
        ...Array.from({ length: 5 }, () =>
          makeRequest('GET', '/api/events')
        ),
      ];

      const start = Date.now();
      const results = await Promise.all(operations);
      const duration = Date.now() - start;

      // Calculate success rate
      const successCount = results.filter(
        (r) => r.status >= 200 && r.status < 300
      ).length;
      const successRate = (successCount / results.length) * 100;

      console.log(`Stress test: ${successCount}/${results.length} succeeded (${successRate.toFixed(1)}%)`);
      console.log(`Total duration: ${duration}ms`);

      // Should have high success rate
      expect(successRate).toBeGreaterThan(90);

      // Should complete in reasonable time
      expect(duration).toBeLessThan(10000);
    });
  });
});

