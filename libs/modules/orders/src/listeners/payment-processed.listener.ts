import { DataSource } from 'typeorm';
import { DomainEvent, EventBus } from '@tiny-store/shared-infrastructure';
import { OrderRepository } from '../domain/repositories/order.repository';
import {
  createOrderPaidEvent,
  OrderPaidPayload,
} from '../domain/events/order-paid.event';

export class PaymentProcessedListener {
  private orderRepository: OrderRepository;
  private eventBus: EventBus;

  constructor(dataSource: DataSource) {
    this.orderRepository = new OrderRepository(dataSource);
    this.eventBus = EventBus.getInstance();
  }

  async handle(event: DomainEvent): Promise<void> {
    const { orderId, paymentId, amount } = event.payload;

    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      console.error(`Order ${orderId} not found`);
      return;
    }

    order.markAsPaid(paymentId);
    await this.orderRepository.save(order);

    // Publish OrderPaid event
    const payload: OrderPaidPayload = {
      orderId: order.id,
      paymentId,
      amount,
    };

    const paidEvent = createOrderPaidEvent(order.id, payload);
    await this.eventBus.publish(paidEvent);
  }
}

