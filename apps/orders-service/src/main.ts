/**
 * Orders Service — L3 Selective Extraction Example
 *
 * This standalone service demonstrates what extraction looks like
 * when a module is ready for independent deployment. It uses the
 * EXACT same domain logic from libs/modules/orders/ — only the
 * infrastructure wiring (database, event bus) changes.
 *
 * Key observation: no domain code was duplicated or rewritten.
 * The handlers, services, entities, and value objects are identical
 * to the monolith. Extraction is a topology change, not a code change.
 */
import 'reflect-metadata';
import http from 'http';
import { DataSource } from 'typeorm';
import {
  createDatabaseConnection,
  createAllModuleSchemas,
  EventBus,
  EventStoreRepository,
} from '@tiny-store/shared-infrastructure';
import {
  PlaceOrderHandler,
  ListOrdersHandler,
  GetOrderHandler,
  CancelOrderHandler,
  InventoryReservedListener,
  InventoryReservationFailedListener,
  PaymentProcessedListener,
  PaymentFailedListener,
  ShipmentCreatedListener,
} from '@tiny-store/modules-orders';

const PORT = parseInt(process.env['PORT'] || '3001', 10);

async function bootstrap(): Promise<void> {
  // ── Database ──────────────────────────────────────────────
  // The only infrastructure difference: DATABASE_URL points to
  // a dedicated orders-db instance instead of the shared database.
  const dataSource = await createDatabaseConnection();
  await createAllModuleSchemas(dataSource);
  console.log('✅ Orders database connected (dedicated instance)');

  // ── Event Listeners ───────────────────────────────────────
  // Register ONLY the listeners that the Orders module needs.
  // In the monolith, all listeners are registered centrally.
  // Here, each service registers its own subset.
  const eventBus = EventBus.getInstance();
  const eventStore = new EventStoreRepository(dataSource);

  // Persist all events this service handles
  const orderEvents = [
    'OrderPlaced', 'OrderConfirmed', 'OrderRejected',
    'OrderPaid', 'OrderShipped', 'OrderCancelled',
    'InventoryReserved', 'InventoryReservationFailed',
    'PaymentProcessed', 'PaymentFailed', 'ShipmentCreated',
  ];
  for (const eventName of orderEvents) {
    eventBus.subscribe(eventName, (event) => eventStore.save(event));
  }

  // Orders-specific listeners (react to events from other modules)
  const inventoryReservedListener = new InventoryReservedListener(dataSource);
  eventBus.subscribe('InventoryReserved', (e) => inventoryReservedListener.handle(e));

  const inventoryReservationFailedListener = new InventoryReservationFailedListener(dataSource);
  eventBus.subscribe('InventoryReservationFailed', (e) => inventoryReservationFailedListener.handle(e));

  const paymentProcessedListener = new PaymentProcessedListener(dataSource);
  eventBus.subscribe('PaymentProcessed', (e) => paymentProcessedListener.handle(e));

  const paymentFailedListener = new PaymentFailedListener(dataSource);
  eventBus.subscribe('PaymentFailed', (e) => paymentFailedListener.handle(e));

  const shipmentCreatedListener = new ShipmentCreatedListener(dataSource);
  eventBus.subscribe('ShipmentCreated', (e) => shipmentCreatedListener.handle(e));

  console.log('✅ Orders event listeners registered');

  // ── HTTP Server ───────────────────────────────────────────
  // Minimal routing using Node's built-in http module.
  // No framework dependency — the handlers ARE the business logic.
  const placeOrderHandler = new PlaceOrderHandler(dataSource);
  const listOrdersHandler = new ListOrdersHandler(dataSource);
  const getOrderHandler = new GetOrderHandler(dataSource);
  const cancelOrderHandler = new CancelOrderHandler(dataSource);

  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    try {
      const url = new URL(req.url || '/', `http://localhost:${PORT}`);
      const path = url.pathname;

      // Health check
      if (path === '/health' && req.method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', service: 'orders' }));
        return;
      }

      // POST /orders — place an order
      if (path === '/orders' && req.method === 'POST') {
        const body = await readBody(req);
        const result = await placeOrderHandler.handle(body);
        res.writeHead(201);
        res.end(JSON.stringify(result));
        return;
      }

      // GET /orders — list orders
      if (path === '/orders' && req.method === 'GET') {
        const customerId = url.searchParams.get('customerId') || undefined;
        const status = url.searchParams.get('status') || undefined;
        const result = await listOrdersHandler.handle({ customerId, status });
        res.writeHead(200);
        res.end(JSON.stringify(result));
        return;
      }

      // GET /orders/:id — get order
      const getMatch = path.match(/^\/orders\/([^/]+)$/);
      if (getMatch && req.method === 'GET') {
        const result = await getOrderHandler.handle(getMatch[1]);
        res.writeHead(200);
        res.end(JSON.stringify(result));
        return;
      }

      // POST /orders/:id/cancel — cancel order
      const cancelMatch = path.match(/^\/orders\/([^/]+)\/cancel$/);
      if (cancelMatch && req.method === 'POST') {
        const body = await readBody(req);
        const result = await cancelOrderHandler.handle({
          orderId: cancelMatch[1],
          reason: body.reason || 'Customer requested cancellation',
        });
        res.writeHead(200);
        res.end(JSON.stringify(result));
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (error: any) {
      console.error('Request error:', error);
      res.writeHead(error.statusCode || 500);
      res.end(JSON.stringify({ error: error.message || 'Internal server error' }));
    }
  });

  server.listen(PORT, () => {
    console.log(`🚀 Orders service listening on port ${PORT}`);
  });
}

function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start Orders service:', err);
  process.exit(1);
});
