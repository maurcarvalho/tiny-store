import { DataSource } from 'typeorm';
import { DomainEvent, EventBus } from '@tiny-store/shared-infrastructure';
import { OrderRepository } from '../domain/repositories/order.repository';
import {
  createOrderShippedEvent,
  OrderShippedPayload,
} from '../domain/events/order-shipped.event';

export class ShipmentCreatedListener {
  private orderRepository: OrderRepository;
  private eventBus: EventBus;

  constructor(dataSource: DataSource) {
    this.orderRepository = new OrderRepository(dataSource);
    this.eventBus = EventBus.getInstance();
  }

  async handle(event: DomainEvent): Promise<void> {
    const { orderId, shipmentId } = event.payload;

    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      console.error(`Order ${orderId} not found`);
      return;
    }

    order.markAsShipped(shipmentId);
    await this.orderRepository.save(order);

    // Publish OrderShipped event
    const payload: OrderShippedPayload = {
      orderId: order.id,
      shipmentId,
    };

    const shippedEvent = createOrderShippedEvent(order.id, payload);
    await this.eventBus.publish(shippedEvent);
  }
}

