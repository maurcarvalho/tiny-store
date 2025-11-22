import { DomainEvent } from '@tiny-store/shared-infrastructure';
import { v4 as uuidv4 } from 'uuid';

export interface PaymentProcessedPayload {
  paymentId: string;
  orderId: string;
  amount: number;
  method: string;
}

export const createPaymentProcessedEvent = (
  paymentId: string,
  payload: PaymentProcessedPayload
): DomainEvent => ({
  eventId: uuidv4(),
  eventType: 'PaymentProcessed',
  aggregateId: paymentId,
  aggregateType: 'Payment',
  occurredAt: new Date(),
  payload,
  version: 1,
});

