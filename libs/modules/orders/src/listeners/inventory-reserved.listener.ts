import { DataSource } from 'typeorm';
import { DomainEvent, EventBus } from '@tiny-store/shared-infrastructure';
import { OrderRepository } from '../domain/repositories/order.repository';
import {
  createOrderConfirmedEvent,
  OrderConfirmedPayload,
} from '../domain/events/order-confirmed.event';

export class InventoryReservedListener {
  private orderRepository: OrderRepository;
  private eventBus: EventBus;

  constructor(dataSource: DataSource) {
    this.orderRepository = new OrderRepository(dataSource);
    this.eventBus = EventBus.getInstance();
  }

  async handle(event: DomainEvent): Promise<void> {
    const { orderId } = event.payload;

    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      console.error(`Order ${orderId} not found`);
      return;
    }

    order.confirm();
    await this.orderRepository.save(order);

    // Publish OrderConfirmed event
    const payload: OrderConfirmedPayload = {
      orderId: order.id,
    };

    const confirmedEvent = createOrderConfirmedEvent(order.id, payload);
    await this.eventBus.publish(confirmedEvent);
  }
}

