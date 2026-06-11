import { v4 as uuidv4 } from 'uuid';
import { DomainEvent, EventBus } from '@tiny-store/shared-infrastructure';

export interface OrderItemDto {
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface ReservationResult {
  success: boolean;
  reason?: string;
}

export interface InventoryGateway {
  reserveItems(orderId: string, items: OrderItemDto[]): Promise<ReservationResult>;
  releaseItems(orderId: string): Promise<void>;
}

function createReserveStockEvent(
  orderId: string,
  items: OrderItemDto[]
): DomainEvent {
  return {
    eventId: uuidv4(),
    eventType: 'OrderPlaced',
    aggregateId: orderId,
    aggregateType: 'Order',
    occurredAt: new Date(),
    payload: { orderId, items },
    version: 1,
  };
}

function createReleaseStockEvent(orderId: string): DomainEvent {
  return {
    eventId: uuidv4(),
    eventType: 'OrderCancelled',
    aggregateId: orderId,
    aggregateType: 'Order',
    occurredAt: new Date(),
    payload: { orderId },
    version: 1,
  };
}

export class InProcessInventoryGateway implements InventoryGateway {
  constructor(private eventBus: EventBus) {}

  async reserveItems(
    orderId: string,
    items: OrderItemDto[]
  ): Promise<ReservationResult> {
    await this.eventBus.publish(createReserveStockEvent(orderId, items));
    return { success: true };
  }

  async releaseItems(orderId: string): Promise<void> {
    await this.eventBus.publish(createReleaseStockEvent(orderId));
  }
}
