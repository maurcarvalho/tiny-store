import { DomainEvent } from '@tiny-store/shared-infrastructure';
import { v4 as uuidv4 } from 'uuid';

export interface OrderPlacedPayload {
  orderId: string;
  customerId: string;
  items: Array<{ sku: string; quantity: number; unitPrice: number }>;
  totalAmount: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export const createOrderPlacedEvent = (
  orderId: string,
  payload: OrderPlacedPayload
): DomainEvent => ({
  eventId: uuidv4(),
  eventType: 'OrderPlaced',
  aggregateId: orderId,
  aggregateType: 'Order',
  occurredAt: new Date(),
  payload,
  version: 1,
});

