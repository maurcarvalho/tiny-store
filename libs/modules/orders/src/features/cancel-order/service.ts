import { DataSource } from 'typeorm';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { EventBus } from '@tiny-store/shared-infrastructure';
import { NotFoundError } from '@tiny-store/shared-domain';
import { CancelOrderDto, CancelOrderResponse } from './dto';
import {
  createOrderCancelledEvent,
  OrderCancelledPayload,
} from '../../domain/events/order-cancelled.event';

export class CancelOrderService {
  private orderRepository: OrderRepository;
  private eventBus: EventBus;

  constructor(dataSource: DataSource) {
    this.orderRepository = new OrderRepository(dataSource);
    this.eventBus = EventBus.getInstance();
  }

  async execute(dto: CancelOrderDto): Promise<CancelOrderResponse> {
    const order = await this.orderRepository.findById(dto.orderId);

    if (!order) {
      throw new NotFoundError(`Order ${dto.orderId} not found`);
    }

    order.cancel(dto.reason);

    await this.orderRepository.save(order);

    // Publish OrderCancelled event
    const payload: OrderCancelledPayload = {
      orderId: order.id,
      reason: dto.reason,
    };

    const event = createOrderCancelledEvent(order.id, payload);
    await this.eventBus.publish(event);

    return {
      orderId: order.id,
      status: order.status,
    };
  }
}

