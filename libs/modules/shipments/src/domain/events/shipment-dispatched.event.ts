import { DomainEvent } from '@tiny-store/shared-infrastructure';
import { v4 as uuidv4 } from 'uuid';

export interface ShipmentDispatchedPayload {
  shipmentId: string;
  trackingNumber: string;
}

export const createShipmentDispatchedEvent = (
  shipmentId: string,
  payload: ShipmentDispatchedPayload
): DomainEvent => ({
  eventId: uuidv4(),
  eventType: 'ShipmentDispatched',
  aggregateId: shipmentId,
  aggregateType: 'Shipment',
  occurredAt: new Date(),
  payload,
  version: 1,
});

