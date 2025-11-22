import { DataSource } from 'typeorm';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { Order } from '../../domain/entities/order';
import { CustomerId } from '../../domain/value-objects/customer-id.value-object';
import { OrderItem } from '../../domain/value-objects/order-item.value-object';
import { Address, Money } from '@tiny-store/shared-domain';
import { EventBus } from '@tiny-store/shared-infrastructure';
import { PlaceOrderDto, PlaceOrderResponse } from './dto';
import {
  createOrderPlacedEvent,
  OrderPlacedPayload,
} from '../../domain/events/order-placed.event';

export class PlaceOrderService {
  private orderRepository: OrderRepository;
  private eventBus: EventBus;

  constructor(dataSource: DataSource) {
    this.orderRepository = new OrderRepository(dataSource);
    this.eventBus = EventBus.getInstance();
  }

  async execute(dto: PlaceOrderDto): Promise<PlaceOrderResponse> {
    const customerId = CustomerId.create(dto.customerId);

    const items = dto.items.map((item) =>
      OrderItem.create(item.sku, item.quantity, Money.create(item.unitPrice))
    );

    const address = Address.create(
      dto.shippingAddress.street,
      dto.shippingAddress.city,
      dto.shippingAddress.state,
      dto.shippingAddress.postalCode,
      dto.shippingAddress.country
    );

    const order = Order.create(customerId, items, address);

    await this.orderRepository.save(order);

    // Publish OrderPlaced event
    const payload: OrderPlacedPayload = {
      orderId: order.id,
      customerId: order.customerId.value,
      items: order.items.map((item) => ({
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice.amount,
      })),
      totalAmount: order.calculateTotal().amount,
      shippingAddress: {
        street: order.shippingAddress.street,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        postalCode: order.shippingAddress.postalCode,
        country: order.shippingAddress.country,
      },
    };

    const event = createOrderPlacedEvent(order.id, payload);
    await this.eventBus.publish(event);

    return {
      orderId: order.id,
      status: order.status,
      totalAmount: order.calculateTotal().amount,
      createdAt: order.createdAt,
    };
  }
}

