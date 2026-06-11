import { v4 as uuidv4 } from 'uuid';
import type { DrizzleDb, EventBus, DomainEvent } from '@tiny-store/shared-infrastructure';
import type { OrderInput } from './types';
import {
  InProcessInventoryGateway,
  type InventoryGateway,
} from '../gateways/inventory-gateway';

export interface OrderActivities {
  reserveInventory(input: OrderInput): Promise<{ success: boolean }>;
  releaseInventory(input: OrderInput): Promise<void>;
  processPayment(input: OrderInput): Promise<{ success: boolean }>;
  refundPayment(input: OrderInput): Promise<void>;
  createShipment(input: OrderInput): Promise<{ trackingNumber: string }>;
}

function buildEvent(
  eventType: string,
  aggregateId: string,
  aggregateType: string,
  payload: Record<string, unknown>
): DomainEvent {
  return {
    eventId: uuidv4(),
    eventType,
    aggregateId,
    aggregateType,
    occurredAt: new Date(),
    payload,
    version: 1,
  };
}

export function createOrderActivities(
  _db: DrizzleDb,
  eventBus: EventBus
): OrderActivities {
  const inventory: InventoryGateway = new InProcessInventoryGateway(eventBus);

  return {
    async reserveInventory(input) {
      const result = await inventory.reserveItems(input.orderId, input.items);
      return { success: result.success };
    },
    async releaseInventory(input) {
      await inventory.releaseItems(input.orderId);
    },
    async processPayment(input) {
      await eventBus.publish(
        buildEvent('OrderConfirmed', input.orderId, 'Order', {
          orderId: input.orderId,
          customerId: input.customerId,
          totalAmount: input.totalAmount,
        })
      );
      return { success: true };
    },
    async refundPayment(input) {
      await eventBus.publish(
        buildEvent('OrderPaymentFailed', input.orderId, 'Order', {
          orderId: input.orderId,
          reason: 'workflow-compensation',
        })
      );
    },
    async createShipment(input) {
      const trackingNumber = `TRK-${uuidv4()}`;
      await eventBus.publish(
        buildEvent('OrderPaid', input.orderId, 'Order', {
          orderId: input.orderId,
          shippingAddress: input.shippingAddress,
          trackingNumber,
        })
      );
      return { trackingNumber };
    },
  };
}
