import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { EventBus } from '@tiny-store/shared-infrastructure';
import { EventStoreRepository } from '@tiny-store/shared-infrastructure';

// ── Extraction Configuration ────────────────────────────────
// Modules listed in EXTRACTED_MODULES run as independent services
// and are skipped during monolith listener registration.
const EXTRACTED_MODULES = new Set(
  (process.env['EXTRACTED_MODULES'] || '')
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean)
);

// ── Per-Module Registration Functions ───────────────────────
// Each module defines its own listener wiring. Adding a new module
// means adding one function and one entry to MODULE_REGISTRY.

function registerInventoryListeners(dataSource: DataSource, eventBus: EventBus): void {
  const { OrderPlacedListener } = require('@tiny-store/modules-inventory');
  const { OrderCancelledListener } = require('@tiny-store/modules-inventory');
  const { OrderPaymentFailedListener } = require('@tiny-store/modules-inventory');
  const { registerStockSyncWorker } = require('@tiny-store/modules-inventory');

  const orderPlacedListener = new OrderPlacedListener(dataSource);
  eventBus.subscribe('OrderPlaced', (event: any) => orderPlacedListener.handle(event));

  const orderCancelledListener = new OrderCancelledListener(dataSource);
  eventBus.subscribe('OrderCancelled', (event: any) => orderCancelledListener.handle(event));

  const orderPaymentFailedListener = new OrderPaymentFailedListener(dataSource);
  eventBus.subscribe('OrderPaymentFailed', (event: any) =>
    orderPaymentFailedListener.handle(event)
  );

  registerStockSyncWorker(async (data: any) => {
    console.log(`[StockSync] Processing ${data.items.length} items from ${data.source}`);
  });
}

function registerOrdersListeners(dataSource: DataSource, eventBus: EventBus): void {
  const { InventoryReservedListener } = require('@tiny-store/modules-orders');
  const { InventoryReservationFailedListener } = require('@tiny-store/modules-orders');
  const { PaymentProcessedListener } = require('@tiny-store/modules-orders');
  const { PaymentFailedListener } = require('@tiny-store/modules-orders');
  const { ShipmentCreatedListener } = require('@tiny-store/modules-orders');

  const inventoryReservedListener = new InventoryReservedListener(dataSource);
  eventBus.subscribe('InventoryReserved', (event: any) =>
    inventoryReservedListener.handle(event)
  );

  const inventoryReservationFailedListener = new InventoryReservationFailedListener(dataSource);
  eventBus.subscribe('InventoryReservationFailed', (event: any) =>
    inventoryReservationFailedListener.handle(event)
  );

  const paymentProcessedListener = new PaymentProcessedListener(dataSource);
  eventBus.subscribe('PaymentProcessed', (event: any) => paymentProcessedListener.handle(event));

  const paymentFailedListener = new PaymentFailedListener(dataSource);
  eventBus.subscribe('PaymentFailed', (event: any) => paymentFailedListener.handle(event));

  const shipmentCreatedListener = new ShipmentCreatedListener(dataSource);
  eventBus.subscribe('ShipmentCreated', (event: any) => shipmentCreatedListener.handle(event));
}

function registerPaymentsListeners(dataSource: DataSource, eventBus: EventBus): void {
  const { ProcessPaymentHandler } = require('@tiny-store/modules-payments');
  const { registerPaymentProcessingWorker } = require('@tiny-store/modules-payments');
  const { GetOrderHandler } = require('@tiny-store/modules-orders');

  const processPaymentHandler = new ProcessPaymentHandler(dataSource);
  const getOrderHandler = new GetOrderHandler(dataSource);

  eventBus.subscribe('OrderConfirmed', async (event: any) => {
    const { orderId } = event.payload;
    try {
      const order = await getOrderHandler.handle(orderId);
      await processPaymentHandler.handle({
        orderId,
        amount: order.totalAmount,
      });
    } catch (error) {
      console.error('Error processing payment for confirmed order:', error);
    }
  });

  registerPaymentProcessingWorker(async (data: any) => {
    try {
      await processPaymentHandler.handle(data);
    } catch (error) {
      console.error('Error processing payment via queue:', error);
      throw error;
    }
  });
}

function registerShipmentsListeners(dataSource: DataSource, eventBus: EventBus): void {
  const { CreateShipmentHandler } = require('@tiny-store/modules-shipments');
  const { registerLabelGenerationWorker } = require('@tiny-store/modules-shipments');
  const { GetOrderHandler } = require('@tiny-store/modules-orders');

  const createShipmentHandler = new CreateShipmentHandler(dataSource);
  const getOrderHandler = new GetOrderHandler(dataSource);

  eventBus.subscribe('OrderPaid', async (event: any) => {
    const { orderId } = event.payload;
    try {
      const order = await getOrderHandler.handle(orderId);
      await createShipmentHandler.handle({
        orderId,
        shippingAddress: order.shippingAddress,
      });
    } catch (error) {
      console.error('Error creating shipment for paid order:', error);
    }
  });

  registerLabelGenerationWorker();
}

// ── Module Registry ─────────────────────────────────────────
// Single place to add or remove modules. Extraction is controlled
// entirely by the EXTRACTED_MODULES environment variable.
const MODULE_REGISTRY: Record<string, (ds: DataSource, eb: EventBus) => void> = {
  inventory: registerInventoryListeners,
  orders: registerOrdersListeners,
  payments: registerPaymentsListeners,
  shipments: registerShipmentsListeners,
};

// ── Event Store (always active) ─────────────────────────────
const ALL_EVENTS = [
  'OrderPlaced', 'OrderConfirmed', 'OrderRejected',
  'OrderPaid', 'OrderPaymentFailed', 'OrderShipped', 'OrderCancelled',
  'InventoryReserved', 'InventoryReservationFailed', 'InventoryReleased',
  'PaymentProcessed', 'PaymentFailed', 'ShipmentCreated',
];

// ── Orchestrator ────────────────────────────────────────────
export function registerListeners(dataSource: DataSource): void {
  const eventBus = EventBus.getInstance();
  const eventStoreRepository = new EventStoreRepository(dataSource);

  // Event store captures all events regardless of extraction
  for (const eventName of ALL_EVENTS) {
    eventBus.subscribe(eventName, (event) => eventStoreRepository.save(event));
  }

  // Register each non-extracted module
  for (const [moduleName, register] of Object.entries(MODULE_REGISTRY)) {
    if (EXTRACTED_MODULES.has(moduleName)) {
      console.log(`⏭️  ${moduleName} listeners skipped (module extracted)`);
      continue;
    }
    register(dataSource, eventBus);
  }

  if (EXTRACTED_MODULES.size > 0) {
    console.log(`✅ Event listeners registered (extracted: ${[...EXTRACTED_MODULES].join(', ')})`);
  } else {
    console.log('✅ Event listeners registered');
  }
}
