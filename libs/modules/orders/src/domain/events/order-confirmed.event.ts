import { DomainEvent } from '@tiny-store/shared-infrastructure';
import { v4 as uuidv4 } from 'uuid';

export interface OrderConfirmedPayload {
  orderId: string;
}

export const createOrderConfirmedEvent = (
  orderId: string,
  payload: OrderConfirmedPayload
): DomainEvent => ({
  eventId: uuidv4(),
  eventType: 'OrderConfirmed',
  aggregateId: orderId,
  aggregateType: 'Order',
  occurredAt: new Date(),
  payload,
  version: 1,
});

