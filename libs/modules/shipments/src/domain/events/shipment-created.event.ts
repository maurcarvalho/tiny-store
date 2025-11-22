import { DomainEvent } from '@tiny-store/shared-infrastructure';
import { v4 as uuidv4 } from 'uuid';

export interface ShipmentCreatedPayload {
  shipmentId: string;
  orderId: string;
  trackingNumber: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export const createShipmentCreatedEvent = (
  shipmentId: string,
  payload: ShipmentCreatedPayload
): DomainEvent => ({
  eventId: uuidv4(),
  eventType: 'ShipmentCreated',
  aggregateId: shipmentId,
  aggregateType: 'Shipment',
  occurredAt: new Date(),
  payload,
  version: 1,
});

