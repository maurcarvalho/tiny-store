/**
 * Orders Worker — L3 Selective Extraction Example
 *
 * This standalone process demonstrates what extraction looks like
 * when a module is ready for independent deployment. It uses the
 * EXACT same domain logic from libs/modules/orders/ — only the
 * infrastructure wiring (database, event bus) changes.
 *
 * The worker connects to its own database and registers only the
 * event listeners that the Orders module needs. It does NOT expose
 * an HTTP API — the monolith (or an API gateway) continues to
 * serve REST endpoints. Commands reach Orders through events;
 * results propagate back through events.
 *
 * When an independent API surface is needed (separate team, SLA,
 * or deployment cadence), an HTTP layer can be added on top of
 * the same handlers without changing any domain logic.
 *
 * Key observation: no domain code was duplicated or rewritten.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  createDatabaseConnection,
  createAllModuleSchemas,
  EventBus,
  EventStoreRepository,
} from '@tiny-store/shared-infrastructure';
import {
  InventoryReservedListener,
  InventoryReservationFailedListener,
  PaymentProcessedListener,
  PaymentFailedListener,
  ShipmentCreatedListener,
} from '@tiny-store/modules-orders';

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
  // Here, the worker registers its own subset.
  const eventBus = EventBus.getInstance();
  const eventStore = new EventStoreRepository(dataSource);

  // Persist events this worker handles
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
  console.log('🚀 Orders worker running — listening for events');

  // Keep the process alive
  process.on('SIGTERM', () => {
    console.log('Orders worker shutting down...');
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start Orders worker:', err);
  process.exit(1);
});
