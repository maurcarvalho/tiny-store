import { DomainEvent } from '@tiny-store/shared-infrastructure';
import { v4 as uuidv4 } from 'uuid';

export interface ShipmentDeliveredPayload {
  shipmentId: string;
  trackingNumber: string;
  deliveredAt: Date;
}

export const createShipmentDeliveredEvent = (
  shipmentId: string,
  payload: ShipmentDeliveredPayload
): DomainEvent => ({
  eventId: uuidv4(),
  eventType: 'ShipmentDelivered',
  aggregateId: shipmentId,
  aggregateType: 'Shipment',
  occurredAt: new Date(),
  payload,
  version: 1,
});

