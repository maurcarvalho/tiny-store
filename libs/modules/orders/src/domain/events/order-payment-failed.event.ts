import { DomainEvent } from '@tiny-store/shared-infrastructure';
import { v4 as uuidv4 } from 'uuid';

export interface OrderPaymentFailedPayload {
  orderId: string;
  reason: string;
}

export const createOrderPaymentFailedEvent = (
  orderId: string,
  payload: OrderPaymentFailedPayload
): DomainEvent => ({
  eventId: uuidv4(),
  eventType: 'OrderPaymentFailed',
  aggregateId: orderId,
  aggregateType: 'Order',
  occurredAt: new Date(),
  payload,
  version: 1,
});

