import { DomainEvent } from '@tiny-store/shared-infrastructure';
import { v4 as uuidv4 } from 'uuid';

export interface OrderRejectedPayload {
  orderId: string;
  reason: string;
}

export const createOrderRejectedEvent = (
  orderId: string,
  payload: OrderRejectedPayload
): DomainEvent => ({
  eventId: uuidv4(),
  eventType: 'OrderRejected',
  aggregateId: orderId,
  aggregateType: 'Order',
  occurredAt: new Date(),
  payload,
  version: 1,
});

