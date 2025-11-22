import 'reflect-metadata';
import { DataSource } from 'typeorm';
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

// Shipments
import { OrderPaidListener } from '@tiny-store/modules-shipments';
import { CreateShipmentHandler } from '@tiny-store/modules-shipments';

// Orders - for accessing order details
import { GetOrderHandler } from '@tiny-store/modules-orders';

export function registerListeners(dataSource: DataSource): void {
  const eventBus = EventBus.getInstance();
  const eventStoreRepository = new EventStoreRepository(dataSource);

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

  // Inventory listeners
  const orderPlacedListener = new OrderPlacedListener(dataSource);
  eventBus.subscribe('OrderPlaced', (event) => orderPlacedListener.handle(event));

  const orderCancelledListener = new OrderCancelledListener(dataSource);
  eventBus.subscribe('OrderCancelled', (event) => orderCancelledListener.handle(event));

  const orderPaymentFailedListener = new OrderPaymentFailedListener(dataSource);
  eventBus.subscribe('OrderPaymentFailed', (event) =>
    orderPaymentFailedListener.handle(event)
  );

  // Orders listeners
  const inventoryReservedListener = new InventoryReservedListener(dataSource);
  eventBus.subscribe('InventoryReserved', (event) =>
    inventoryReservedListener.handle(event)
  );

  const inventoryReservationFailedListener = new InventoryReservationFailedListener(dataSource);
  eventBus.subscribe('InventoryReservationFailed', (event) =>
    inventoryReservationFailedListener.handle(event)
  );

  const paymentProcessedListener = new PaymentProcessedListener(dataSource);
  eventBus.subscribe('PaymentProcessed', (event) => paymentProcessedListener.handle(event));

  const paymentFailedListener = new PaymentFailedListener(dataSource);
  eventBus.subscribe('PaymentFailed', (event) => paymentFailedListener.handle(event));

  const shipmentCreatedListener = new ShipmentCreatedListener(dataSource);
  eventBus.subscribe('ShipmentCreated', (event) => shipmentCreatedListener.handle(event));

  // Payments listener (custom implementation to get order amount)
  const processPaymentHandler = new ProcessPaymentHandler(dataSource);
  const getOrderHandler = new GetOrderHandler(dataSource);
  
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

  // Shipments listener (custom implementation to get shipping address)
  const createShipmentHandler = new CreateShipmentHandler(dataSource);
  
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

  console.log('✅ Event listeners registered');
}

