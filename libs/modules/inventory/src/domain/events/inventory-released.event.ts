import { DomainEvent } from '@tiny-store/shared-infrastructure';

export interface InventoryReleasedPayload {
  orderId: string;
  reservations: Array<{ sku: string; quantity: number }>;
}

export const createInventoryReleasedEvent = (
  productId: string,
  payload: InventoryReleasedPayload
): DomainEvent => ({
  eventId: require('uuid').v4(),
  eventType: 'InventoryReleased',
  aggregateId: productId,
  aggregateType: 'Product',
  occurredAt: new Date(),
  payload,
  version: 1,
});

