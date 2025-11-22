import { DataSource } from 'typeorm';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { NotFoundError } from '@tiny-store/shared-domain';
import { GetOrderResponse } from './dto';

export class GetOrderService {
  private orderRepository: OrderRepository;

  constructor(dataSource: DataSource) {
    this.orderRepository = new OrderRepository(dataSource);
  }

  async execute(orderId: string): Promise<GetOrderResponse> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new NotFoundError(`Order ${orderId} not found`);
    }

    return {
      orderId: order.id,
      customerId: order.customerId.value,
      items: order.items.map((item) => ({
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice.amount,
        totalPrice: item.totalPrice.amount,
      })),
      totalAmount: order.calculateTotal().amount,
      shippingAddress: {
        street: order.shippingAddress.street,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        postalCode: order.shippingAddress.postalCode,
        country: order.shippingAddress.country,
      },
      status: order.status,
      paymentId: order.paymentId ?? undefined,
      shipmentId: order.shipmentId ?? undefined,
      cancellationReason: order.cancellationReason ?? undefined,
      rejectionReason: order.rejectionReason ?? undefined,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}

