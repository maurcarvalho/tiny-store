import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { EventBus } from '@tiny-store/shared-infrastructure';
import { EventStoreRepository } from '@tiny-store/shared-infrastructure';

// Inventory
import { OrderPlacedListener } from '@tiny-store/modules-inventory';
import { OrderCancelledListener } from '@tiny-store/modules-inventory';
import { OrderPaymentFailedListener } from '@tiny-store/modules-inventory';

// Orders
import { InventoryReservedListener } from '@tiny-store/modules-orders';
import { InventoryReservationFailedListener } from '@tiny-store/modules-orders';
import { PaymentProcessedListener } from '@tiny-store/modules-orders';
import { PaymentFailedListener } from '@tiny-store/modules-orders';
import { ShipmentCreatedListener } from '@tiny-store/modules-orders';

// Payments
import { OrderConfirmedListener } from '@tiny-store/modules-payments';
import { ProcessPaymentHandler } from '@tiny-store/modules-payments';

// Payments - Jobs
import { registerPaymentProcessingWorker } from '@tiny-store/modules-payments';

// Inventory - Jobs
import { registerStockSyncWorker } from '@tiny-store/modules-inventory';

// Shipments
import { OrderPaidListener } from '@tiny-store/modules-shipments';
import { CreateShipmentHandler } from '@tiny-store/modules-shipments';
import { registerLabelGenerationWorker } from '@tiny-store/modules-shipments';

// Orders - for accessing order details
import { GetOrderHandler } from '@tiny-store/modules-orders';

const EXTRACTED_MODULES = (process.env['EXTRACTED_MODULES'] || '')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

function isExtracted(mod: string): boolean {
  return EXTRACTED_MODULES.includes(mod);
}

/**
 * MODULE_REGISTRY maps module names to their registration functions.
 * Extracting a module is a one-line config change via EXTRACTED_MODULES env var.
 */
const MODULE_REGISTRY: Record<string, (db: DrizzleDb, eventBus: EventBus) => void> = {
  inventory: registerInventoryListeners,
  orders: registerOrdersListeners,
  payments: registerPaymentsListeners,
  shipments: registerShipmentsListeners,
};

function registerInventoryListeners(db: DrizzleDb, eventBus: EventBus): void {
  const orderPlacedListener = new OrderPlacedListener(db);
  eventBus.subscribe('OrderPlaced', (event) => orderPlacedListener.handle(event));

  const orderCancelledListener = new OrderCancelledListener(db);
  eventBus.subscribe('OrderCancelled', (event) => orderCancelledListener.handle(event));

  const orderPaymentFailedListener = new OrderPaymentFailedListener(db);
  eventBus.subscribe('OrderPaymentFailed', (event) =>
    orderPaymentFailedListener.handle(event)
  );

  registerStockSyncWorker(async (data) => {
    console.log(`[StockSync] Processing ${data.items.length} items from ${data.source}`);
  });
}

function registerOrdersListeners(db: DrizzleDb, eventBus: EventBus): void {
  const inventoryReservedListener = new InventoryReservedListener(db);
  eventBus.subscribe('InventoryReserved', (event) =>
    inventoryReservedListener.handle(event)
  );

  const inventoryReservationFailedListener = new InventoryReservationFailedListener(db);
  eventBus.subscribe('InventoryReservationFailed', (event) =>
    inventoryReservationFailedListener.handle(event)
  );

  const paymentProcessedListener = new PaymentProcessedListener(db);
  eventBus.subscribe('PaymentProcessed', (event) => paymentProcessedListener.handle(event));

  const paymentFailedListener = new PaymentFailedListener(db);
  eventBus.subscribe('PaymentFailed', (event) => paymentFailedListener.handle(event));

  const shipmentCreatedListener = new ShipmentCreatedListener(db);
  eventBus.subscribe('ShipmentCreated', (event) => shipmentCreatedListener.handle(event));
}

function registerPaymentsListeners(db: DrizzleDb, eventBus: EventBus): void {
  const processPaymentHandler = new ProcessPaymentHandler(db);
  const getOrderHandler = new GetOrderHandler(db);

  eventBus.subscribe('OrderConfirmed', async (event) => {
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

  registerPaymentProcessingWorker(async (data) => {
    try {
      await processPaymentHandler.handle(data);
    } catch (error) {
      console.error('Error processing payment via queue:', error);
      throw error;
    }
  });
}

function registerShipmentsListeners(db: DrizzleDb, eventBus: EventBus): void {
  const createShipmentHandler = new CreateShipmentHandler(db);
  const getOrderHandler = new GetOrderHandler(db);

  eventBus.subscribe('OrderPaid', async (event) => {
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

export function registerListeners(db: DrizzleDb): void {
  const eventBus = EventBus.getInstance();
  const eventStoreRepository = new EventStoreRepository(db);

  // Store all events
  eventBus.subscribe('OrderPlaced', async (event) => {
    await eventStoreRepository.save(event);
  });
  eventBus.subscribe('OrderConfirmed', async (event) => {
    await eventStoreRepository.save(event);
  });
  eventBus.subscribe('OrderRejected', async (event) => {
    await eventStoreRepository.save(event);
  });
  eventBus.subscribe('OrderPaid', async (event) => {
    await eventStoreRepository.save(event);
  });
  eventBus.subscribe('OrderPaymentFailed', async (event) => {
    await eventStoreRepository.save(event);
  });
  eventBus.subscribe('OrderShipped', async (event) => {
    await eventStoreRepository.save(event);
  });
  eventBus.subscribe('OrderCancelled', async (event) => {
    await eventStoreRepository.save(event);
  });
  eventBus.subscribe('InventoryReserved', async (event) => {
    await eventStoreRepository.save(event);
  });
  eventBus.subscribe('InventoryReservationFailed', async (event) => {
    await eventStoreRepository.save(event);
  });
  eventBus.subscribe('InventoryReleased', async (event) => {
    await eventStoreRepository.save(event);
  });
  eventBus.subscribe('PaymentProcessed', async (event) => {
    await eventStoreRepository.save(event);
  });
  eventBus.subscribe('PaymentFailed', async (event) => {
    await eventStoreRepository.save(event);
  });
  eventBus.subscribe('ShipmentCreated', async (event) => {
    await eventStoreRepository.save(event);
  });

  // Register module listeners via registry, skipping extracted modules
  for (const [moduleName, registerFn] of Object.entries(MODULE_REGISTRY)) {
    if (isExtracted(moduleName)) {
      console.log(`Skipping registration for extracted module: ${moduleName}`);
      continue;
    }
    registerFn(db, eventBus);
  }

  console.log('Event listeners registered');
}
