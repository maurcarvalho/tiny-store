import { DataSource } from 'typeorm';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderStatus } from '../../domain/enums/order-status.enum';
import { ListOrdersQuery, ListOrdersResponse } from './dto';

export class ListOrdersService {
  private orderRepository: OrderRepository;

  constructor(dataSource: DataSource) {
    this.orderRepository = new OrderRepository(dataSource);
  }

  async execute(query: ListOrdersQuery): Promise<ListOrdersResponse> {
    let orders;

    if (query.customerId) {
      orders = await this.orderRepository.findByCustomerId(query.customerId);
    } else if (query.status) {
      orders = await this.orderRepository.findByStatus(query.status as OrderStatus);
    } else {
      orders = await this.orderRepository.findAll();
    }

    return {
      orders: orders.map((order) => ({
        orderId: order.id,
        customerId: order.customerId.value,
        totalAmount: order.calculateTotal().amount,
        status: order.status,
        createdAt: order.createdAt,
      })),
    };
  }
}

