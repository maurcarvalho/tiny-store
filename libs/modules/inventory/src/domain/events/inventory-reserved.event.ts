import { DomainEvent } from '@tiny-store/shared-infrastructure';

export interface InventoryReservedPayload {
  orderId: string;
  reservations: Array<{ sku: string; quantity: number }>;
}

export const createInventoryReservedEvent = (
  productId: string,
  payload: InventoryReservedPayload
): DomainEvent => ({
  eventId: require('uuid').v4(),
  eventType: 'InventoryReserved',
  aggregateId: productId,
  aggregateType: 'Product',
  occurredAt: new Date(),
  payload,
  version: 1,
});

