import { DataSource } from 'typeorm';
import { DomainEvent, EventBus } from '@tiny-store/shared-infrastructure';
import { OrderRepository } from '../domain/repositories/order.repository';
import {
  createOrderPaymentFailedEvent,
  OrderPaymentFailedPayload,
} from '../domain/events/order-payment-failed.event';

export class PaymentFailedListener {
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

    order.markPaymentFailed(reason);
    await this.orderRepository.save(order);

    // Publish OrderPaymentFailed event
    const payload: OrderPaymentFailedPayload = {
      orderId: order.id,
      reason,
    };

    const failedEvent = createOrderPaymentFailedEvent(order.id, payload);
    await this.eventBus.publish(failedEvent);
  }
}

