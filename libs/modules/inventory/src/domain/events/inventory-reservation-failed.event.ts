import { DomainEvent } from '@tiny-store/shared-infrastructure';

export interface InventoryReservationFailedPayload {
  orderId: string;
  reason: string;
  requestedItems: Array<{ sku: string; quantity: number }>;
}

export const createInventoryReservationFailedEvent = (
  orderId: string,
  payload: InventoryReservationFailedPayload
): DomainEvent => ({
  eventId: require('uuid').v4(),
  eventType: 'InventoryReservationFailed',
  aggregateId: orderId,
  aggregateType: 'Order',
  occurredAt: new Date(),
  payload,
  version: 1,
});

