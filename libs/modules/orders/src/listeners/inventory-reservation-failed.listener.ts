import { DataSource } from 'typeorm';
import { DomainEvent, EventBus } from '@tiny-store/shared-infrastructure';
import { OrderRepository } from '../domain/repositories/order.repository';
import {
  createOrderRejectedEvent,
  OrderRejectedPayload,
} from '../domain/events/order-rejected.event';

export class InventoryReservationFailedListener {
  private orderRepository: OrderRepository;
  private eventBus: EventBus;

  constructor(dataSource: DataSource) {
    this.orderRepository = new OrderRepository(dataSource);
    this.eventBus = EventBus.getInstance();
  }

  async handle(event: DomainEvent): Promise<void> {
    const { orderId, reason } = event.payload;

    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      console.error(`Order ${orderId} not found`);
      return;
    }

    order.reject(reason);
    await this.orderRepository.save(order);

    // Publish OrderRejected event
    const payload: OrderRejectedPayload = {
      orderId: order.id,
      reason,
    };

    const rejectedEvent = createOrderRejectedEvent(order.id, payload);
    await this.eventBus.publish(rejectedEvent);
  }
}

