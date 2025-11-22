import { DomainEvent } from '@tiny-store/shared-infrastructure';
import { v4 as uuidv4 } from 'uuid';

export interface PaymentFailedPayload {
  paymentId: string;
  orderId: string;
  reason: string;
}

export const createPaymentFailedEvent = (
  paymentId: string,
  payload: PaymentFailedPayload
): DomainEvent => ({
  eventId: uuidv4(),
  eventType: 'PaymentFailed',
  aggregateId: paymentId,
  aggregateType: 'Payment',
  occurredAt: new Date(),
  payload,
  version: 1,
});

