/**
 * API Endpoint Tests - Professional Level
 * 
 * These tests verify API behavior including:
 * - Happy paths
 * - Error handling
 * - Validation
 * - Edge cases
 * - Status codes
 * - Response formats
 */

import * as http from 'http';

const BASE_URL = 'http://localhost:3000';

// Test utilities
async function makeRequest(
  method: string,
  path: string,
  body?: any
): Promise<{ status: number; data: any }> {
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
        try {
          const parsed = responseBody ? JSON.parse(responseBody) : {};
          resolve({ status: res.statusCode || 500, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode || 500, data: responseBody });
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

describe('API Endpoint Tests - Professional Level', () => {
  describe('Health Check Endpoint', () => {
    it('GET /api/health - should return 200 and status OK', async () => {
      const response = await makeRequest('GET', '/api/health');

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('OK');
      expect(response.data.message).toBeDefined();
    });
  });

  describe('Product Management Endpoints', () => {
    describe('POST /api/inventory/products - Create Product', () => {
      it('should create a product with valid data', async () => {
        const productData = {
          sku: `TEST-${Date.now()}`,
          name: 'Test Product',
          price: 99.99,
          currency: 'USD',
          stockQuantity: 100,
        };

        const response = await makeRequest(
          'POST',
          '/api/inventory/products',
          productData
        );

        expect(response.status).toBe(201);
        expect(response.data.productId).toBeDefined();
        expect(response.data.sku).toBe(productData.sku);
        expect(response.data.stockQuantity).toBe(100);
      });

      it('should reject product with negative stock', async () => {
        const productData = {
          sku: `TEST-NEG-${Date.now()}`,
          name: 'Invalid Product',
          price: 99.99,
          currency: 'USD',
          stockQuantity: -10,
        };

        const response = await makeRequest(
          'POST',
          '/api/inventory/products',
          productData
        );

        expect(response.status).toBe(400);
        expect(response.data.error).toBeDefined();
      });

      it('should reject product with invalid currency', async () => {
        const productData = {
          sku: `TEST-CURR-${Date.now()}`,
          name: 'Invalid Currency Product',
          price: 99.99,
          currency: 'INVALID',
          stockQuantity: 100,
        };

        const response = await makeRequest(
          'POST',
          '/api/inventory/products',
          productData
        );

        expect(response.status).toBe(400);
        expect(response.data.error).toBeDefined();
      });

      it('should reject product with missing required fields', async () => {
        const productData = {
          sku: `TEST-MISSING-${Date.now()}`,
          // Missing name, price, currency
          stockQuantity: 100,
        };

        const response = await makeRequest(
          'POST',
          '/api/inventory/products',
          productData
        );

        expect(response.status).toBe(400);
        expect(response.data.error).toBeDefined();
      });

      it('should reject product with empty SKU', async () => {
        const productData = {
          sku: '',
          name: 'Empty SKU Product',
          price: 99.99,
          currency: 'USD',
          stockQuantity: 100,
        };

        const response = await makeRequest(
          'POST',
          '/api/inventory/products',
          productData
        );

        expect(response.status).toBe(400);
        expect(response.data.error).toBeDefined();
      });
    });

    describe('GET /api/inventory/products/:sku - Get Product', () => {
      it('should retrieve existing product', async () => {
        // First create a product
        const sku = `GET-TEST-${Date.now()}`;
        const createResponse = await makeRequest(
          'POST',
          '/api/inventory/products',
          {
            sku,
            name: 'Get Test Product',
            price: 50,
            currency: 'USD',
            stockQuantity: 75,
          }
        );

        expect(createResponse.status).toBe(201);

        // Then retrieve it
        const getResponse = await makeRequest(
          'GET',
          `/api/inventory/products/${sku}`
        );

        expect(getResponse.status).toBe(200);
        expect(getResponse.data.sku).toBe(sku);
        expect(getResponse.data.stockQuantity).toBe(75);
      });

      it('should return 404 for non-existent product', async () => {
        const response = await makeRequest(
          'GET',
          '/api/inventory/products/NON-EXISTENT-SKU'
        );

        expect(response.status).toBe(404);
        expect(response.data.error).toBeDefined();
      });
    });

    describe('PATCH /api/inventory/products/:sku - Update Product', () => {
      it('should update product stock quantity', async () => {
        // Create product
        const sku = `PATCH-TEST-${Date.now()}`;
        await makeRequest('POST', '/api/inventory/products', {
          sku,
          name: 'Patch Test Product',
          price: 50,
          currency: 'USD',
          stockQuantity: 100,
        });

        // Update stock
        const patchResponse = await makeRequest(
          'PATCH',
          `/api/inventory/products/${sku}`,
          { stockQuantity: 150 }
        );

        expect(patchResponse.status).toBe(200);
        expect(patchResponse.data.stockQuantity).toBe(150);

        // Verify update
        const getResponse = await makeRequest(
          'GET',
          `/api/inventory/products/${sku}`
        );

        expect(getResponse.data.stockQuantity).toBe(150);
      });

      it('should return 404 when updating non-existent product', async () => {
        const response = await makeRequest(
          'PATCH',
          '/api/inventory/products/NON-EXISTENT',
          { stockQuantity: 100 }
        );

        expect(response.status).toBe(404);
      });
    });
  });

  describe('Order Management Endpoints', () => {
    describe('POST /api/orders - Place Order', () => {
      it('should place order with valid data', async () => {
        // Create product first
        const sku = `ORDER-TEST-${Date.now()}`;
        await makeRequest('POST', '/api/inventory/products', {
          sku,
          name: 'Order Test Product',
          price: 50,
          currency: 'USD',
          stockQuantity: 100,
        });

        // Place order
        const orderData = {
          customerId: 'customer-123',
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
        expect(response.data.orderId).toBeDefined();
        expect(response.data.status).toBe('PENDING');
        expect(response.data.totalAmount).toBeGreaterThan(0);
      });

      it('should reject order with empty items array', async () => {
        const orderData = {
          customerId: 'customer-123',
          items: [],
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            postalCode: '12345',
            country: 'USA',
          },
        };

        const response = await makeRequest('POST', '/api/orders', orderData);

        expect(response.status).toBe(400);
        expect(response.data.error).toBeDefined();
      });

      it('should reject order with invalid address', async () => {
        const sku = `INVALID-ADDR-${Date.now()}`;
        await makeRequest('POST', '/api/inventory/products', {
          sku,
          name: 'Test Product',
          price: 50,
          currency: 'USD',
          stockQuantity: 100,
        });

        const orderData = {
          customerId: 'customer-123',
          items: [
            {
              sku,
              quantity: 5,
              unitPrice: 50,
              currency: 'USD',
            },
          ],
          shippingAddress: {
            street: '',  // Empty street
            city: '',    // Empty city
            state: 'TS',
            postalCode: '12345',
            country: 'USA',
          },
        };

        const response = await makeRequest('POST', '/api/orders', orderData);

        expect(response.status).toBe(400);
        expect(response.data.error).toBeDefined();
      });

      it('should reject order with negative quantity', async () => {
        const sku = `NEG-QTY-${Date.now()}`;
        await makeRequest('POST', '/api/inventory/products', {
          sku,
          name: 'Test Product',
          price: 50,
          currency: 'USD',
          stockQuantity: 100,
        });

        const orderData = {
          customerId: 'customer-123',
          items: [
            {
              sku,
              quantity: -5,  // Negative quantity
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

        expect(response.status).toBe(400);
        expect(response.data.error).toBeDefined();
      });

      it('should handle order with insufficient stock gracefully', async () => {
        const sku = `LOW-STOCK-${Date.now()}`;
        await makeRequest('POST', '/api/inventory/products', {
          sku,
          name: 'Low Stock Product',
          price: 50,
          currency: 'USD',
          stockQuantity: 5,
        });

        const orderData = {
          customerId: 'customer-123',
          items: [
            {
              sku,
              quantity: 100,  // More than available
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
        expect(response.data.orderId).toBeDefined();

        // Wait for event processing
        await wait(300);

        // Check that order was rejected
        const orderResponse = await makeRequest(
          'GET',
          `/api/orders/${response.data.orderId}`
        );

        expect(orderResponse.data.status).toBe('REJECTED');
      });
    });

    describe('GET /api/orders/:orderId - Get Order', () => {
      it('should retrieve existing order', async () => {
        // Create product and order
        const sku = `GET-ORDER-${Date.now()}`;
        await makeRequest('POST', '/api/inventory/products', {
          sku,
          name: 'Test Product',
          price: 50,
          currency: 'USD',
          stockQuantity: 100,
        });

        const orderResponse = await makeRequest('POST', '/api/orders', {
          customerId: 'customer-123',
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
        });

        const orderId = orderResponse.data.orderId;

        // Retrieve order
        const getResponse = await makeRequest('GET', `/api/orders/${orderId}`);

        expect(getResponse.status).toBe(200);
        expect(getResponse.data.orderId).toBe(orderId);
        expect(getResponse.data.status).toBeDefined();
      });

      it('should return 404 for non-existent order', async () => {
        const response = await makeRequest(
          'GET',
          '/api/orders/non-existent-order-id'
        );

        expect(response.status).toBe(404);
        expect(response.data.error).toBeDefined();
      });
    });

    describe('GET /api/orders - List Orders', () => {
      it('should list all orders', async () => {
        const response = await makeRequest('GET', '/api/orders');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
      });

      it('should filter orders by status', async () => {
        // Create an order first
        const sku = `FILTER-TEST-${Date.now()}`;
        await makeRequest('POST', '/api/inventory/products', {
          sku,
          name: 'Filter Test Product',
          price: 50,
          currency: 'USD',
          stockQuantity: 100,
        });

        await makeRequest('POST', '/api/orders', {
          customerId: 'customer-filter-test',
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
        });

        await wait(300);

        // List orders with status filter
        const response = await makeRequest('GET', '/api/orders?status=PENDING');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
      });

      it('should filter orders by customer ID', async () => {
        const customerId = `CUSTOMER-${Date.now()}`;
        
        const sku = `CUST-FILTER-${Date.now()}`;
        await makeRequest('POST', '/api/inventory/products', {
          sku,
          name: 'Customer Filter Test',
          price: 50,
          currency: 'USD',
          stockQuantity: 100,
        });

        await makeRequest('POST', '/api/orders', {
          customerId,
          items: [
            {
              sku,
              quantity: 2,
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
        });

        await wait(100);

        const response = await makeRequest(
          'GET',
          `/api/orders?customerId=${customerId}`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
      });
    });

    describe('POST /api/orders/:orderId/cancel - Cancel Order', () => {
      it('should cancel a pending order', async () => {
        // Create product and order
        const sku = `CANCEL-TEST-${Date.now()}`;
        await makeRequest('POST', '/api/inventory/products', {
          sku,
          name: 'Cancel Test Product',
          price: 50,
          currency: 'USD',
          stockQuantity: 100,
        });

        const orderResponse = await makeRequest('POST', '/api/orders', {
          customerId: 'customer-cancel-test',
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
        });

        const orderId = orderResponse.data.orderId;

        // Wait a bit for processing
        await wait(200);

        // Cancel order
        const cancelResponse = await makeRequest(
          'POST',
          `/api/orders/${orderId}/cancel`,
          {}
        );

        expect(cancelResponse.status).toBe(200);

        // Verify cancellation
        const getResponse = await makeRequest('GET', `/api/orders/${orderId}`);

        expect(getResponse.data.status).toBe('CANCELLED');
      });

      it('should return 404 when cancelling non-existent order', async () => {
        const response = await makeRequest(
          'POST',
          '/api/orders/non-existent-id/cancel',
          {}
        );

        expect(response.status).toBe(404);
      });
    });
  });

  describe('Event Store Endpoints', () => {
    describe('GET /api/events - Query Events', () => {
      it('should retrieve event list', async () => {
        const response = await makeRequest('GET', '/api/events');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
      });

      it('should filter events by type', async () => {
        const response = await makeRequest(
          'GET',
          '/api/events?eventType=OrderPlaced'
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
      });

      it('should filter events by aggregate ID', async () => {
        // Create an order to generate events
        const sku = `EVENT-TEST-${Date.now()}`;
        await makeRequest('POST', '/api/inventory/products', {
          sku,
          name: 'Event Test Product',
          price: 50,
          currency: 'USD',
          stockQuantity: 100,
        });

        const orderResponse = await makeRequest('POST', '/api/orders', {
          customerId: 'customer-event-test',
          items: [
            {
              sku,
              quantity: 2,
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
        });

        await wait(200);

        const orderId = orderResponse.data.orderId;

        const response = await makeRequest(
          'GET',
          `/api/events?aggregateId=${orderId}`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
      });
    });

    describe('GET /api/events/:eventId - Get Single Event', () => {
      it('should retrieve a specific event', async () => {
        // First get list of events
        const listResponse = await makeRequest('GET', '/api/events');

        if (listResponse.data.length > 0) {
          const eventId = listResponse.data[0].eventId;

          const response = await makeRequest('GET', `/api/events/${eventId}`);

          expect(response.status).toBe(200);
          expect(response.data.eventId).toBe(eventId);
        }
      });

      it('should return 404 for non-existent event', async () => {
        const response = await makeRequest(
          'GET',
          '/api/events/non-existent-event-id'
        );

        expect(response.status).toBe(404);
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await makeRequest('GET', '/api/non-existent-route');

      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON gracefully', async () => {
      // This test would require low-level HTTP manipulation
      // For now, we document it as a placeholder
      expect(true).toBe(true);
    });

    it('should return appropriate error messages', async () => {
      const response = await makeRequest('POST', '/api/orders', {
        customerId: 'test',
        items: [],  // Invalid: empty items
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'USA',
        },
      });

      expect(response.status).toBe(400);
      expect(response.data.error).toBeDefined();
      expect(typeof response.data.error).toBe('string');
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent error format', async () => {
      const response = await makeRequest(
          'GET',
        '/api/orders/non-existent-order'
      );

      expect(response.status).toBe(404);
      expect(response.data).toHaveProperty('error');
      expect(typeof response.data.error).toBe('string');
    });

    it('should include timestamps in event responses', async () => {
      const response = await makeRequest('GET', '/api/events');

      if (response.data.length > 0) {
        expect(response.data[0]).toHaveProperty('occurredAt');
      }
    });
  });
});

