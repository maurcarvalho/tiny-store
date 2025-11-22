import { DomainEvent } from '@tiny-store/shared-infrastructure';
import { v4 as uuidv4 } from 'uuid';

export interface OrderPaidPayload {
  orderId: string;
  paymentId: string;
  amount: number;
}

export const createOrderPaidEvent = (
  orderId: string,
  payload: OrderPaidPayload
): DomainEvent => ({
  eventId: uuidv4(),
  eventType: 'OrderPaid',
  aggregateId: orderId,
  aggregateType: 'Order',
  occurredAt: new Date(),
  payload,
  version: 1,
});

