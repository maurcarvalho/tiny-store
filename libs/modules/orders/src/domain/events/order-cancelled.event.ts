import { DomainEvent } from '@tiny-store/shared-infrastructure';
import { v4 as uuidv4 } from 'uuid';

export interface OrderCancelledPayload {
  orderId: string;
  reason: string;
}

export const createOrderCancelledEvent = (
  orderId: string,
  payload: OrderCancelledPayload
): DomainEvent => ({
  eventId: uuidv4(),
  eventType: 'OrderCancelled',
  aggregateId: orderId,
  aggregateType: 'Order',
  occurredAt: new Date(),
  payload,
  version: 1,
});

