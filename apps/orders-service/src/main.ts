/**
 * Orders Standalone Service (L3 Extraction)
 *
 * Runs the Orders module as an independent Express-like HTTP server
 * with its own database connection and event listeners.
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { createDatabaseConnection } from '@tiny-store/shared-infrastructure';
import { EventBus, EventStoreRepository } from '@tiny-store/shared-infrastructure';
import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import {
  PlaceOrderHandler,
  GetOrderHandler,
  CancelOrderHandler,
  ListOrdersHandler,
} from '@tiny-store/modules-orders';
import {
  InventoryReservedListener,
  InventoryReservationFailedListener,
  PaymentProcessedListener,
  PaymentFailedListener,
  ShipmentCreatedListener,
} from '@tiny-store/modules-orders';

const PORT = parseInt(process.env['PORT'] || '3001', 10);

function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function registerOrdersListeners(db: DrizzleDb): void {
  const eventBus = EventBus.getInstance();
  const eventStore = new EventStoreRepository(db);

  // Persist all order-related events
  for (const eventType of [
    'OrderPlaced', 'OrderConfirmed', 'OrderRejected',
    'OrderPaid', 'OrderPaymentFailed', 'OrderShipped', 'OrderCancelled',
    'InventoryReserved', 'InventoryReservationFailed',
    'PaymentProcessed', 'PaymentFailed',
    'ShipmentCreated',
  ]) {
    eventBus.subscribe(eventType, async (event) => {
      await eventStore.save(event);
    });
  }

  // Orders module listeners
  const inventoryReservedListener = new InventoryReservedListener(db);
  eventBus.subscribe('InventoryReserved', (e) => inventoryReservedListener.handle(e));

  const inventoryReservationFailedListener = new InventoryReservationFailedListener(db);
  eventBus.subscribe('InventoryReservationFailed', (e) => inventoryReservationFailedListener.handle(e));

  const paymentProcessedListener = new PaymentProcessedListener(db);
  eventBus.subscribe('PaymentProcessed', (e) => paymentProcessedListener.handle(e));

  const paymentFailedListener = new PaymentFailedListener(db);
  eventBus.subscribe('PaymentFailed', (e) => paymentFailedListener.handle(e));

  const shipmentCreatedListener = new ShipmentCreatedListener(db);
  eventBus.subscribe('ShipmentCreated', (e) => shipmentCreatedListener.handle(e));

  console.log('[orders-service] Event listeners registered');
}

async function main(): Promise<void> {
  const db = await createDatabaseConnection();
  console.log('[orders-service] Database connected');

  registerOrdersListeners(db);

  const placeOrderHandler = new PlaceOrderHandler(db);
  const getOrderHandler = new GetOrderHandler(db);
  const cancelOrderHandler = new CancelOrderHandler(db);
  const listOrdersHandler = new ListOrdersHandler(db);

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);
    const method = req.method || 'GET';
    const pathname = url.pathname;

    try {
      // GET /api/health
      if (method === 'GET' && pathname === '/api/health') {
        return json(res, 200, { status: 'ok', service: 'orders-service' });
      }

      // POST /api/orders — place order
      if (method === 'POST' && pathname === '/api/orders') {
        const body = JSON.parse(await parseBody(req));
        const result = await placeOrderHandler.handle(body);
        return json(res, 201, result);
      }

      // GET /api/orders — list orders
      if (method === 'GET' && pathname === '/api/orders') {
        const customerId = url.searchParams.get('customerId') || undefined;
        const status = url.searchParams.get('status') || undefined;
        const result = await listOrdersHandler.handle({ customerId, status });
        return json(res, 200, result);
      }

      // GET /api/orders/:orderId
      const getMatch = pathname.match(/^\/api\/orders\/([^/]+)$/);
      if (method === 'GET' && getMatch) {
        const result = await getOrderHandler.handle(getMatch[1]);
        return json(res, 200, result);
      }

      // POST /api/orders/:orderId/cancel
      const cancelMatch = pathname.match(/^\/api\/orders\/([^/]+)\/cancel$/);
      if (method === 'POST' && cancelMatch) {
        const body = JSON.parse(await parseBody(req));
        const result = await cancelOrderHandler.handle({
          orderId: cancelMatch[1],
          reason: body.reason || 'Customer requested cancellation',
        });
        return json(res, 200, result);
      }

      json(res, 404, { error: 'Not Found' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      console.error('[orders-service] Error:', error);
      json(res, 500, { error: message });
    }
  });

  server.listen(PORT, () => {
    console.log(`[orders-service] Listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('[orders-service] Fatal error:', err);
  process.exit(1);
});
