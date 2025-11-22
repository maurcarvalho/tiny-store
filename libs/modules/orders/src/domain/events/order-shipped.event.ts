import { DomainEvent } from '@tiny-store/shared-infrastructure';
import { v4 as uuidv4 } from 'uuid';

export interface OrderShippedPayload {
  orderId: string;
  shipmentId: string;
}

export const createOrderShippedEvent = (
  orderId: string,
  payload: OrderShippedPayload
): DomainEvent => ({
  eventId: uuidv4(),
  eventType: 'OrderShipped',
  aggregateId: orderId,
  aggregateType: 'Order',
  occurredAt: new Date(),
  payload,
  version: 1,
});

