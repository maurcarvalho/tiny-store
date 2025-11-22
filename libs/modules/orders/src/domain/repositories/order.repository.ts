import { DataSource, Repository } from 'typeorm';
import { Order } from '../entities/order';
import { OrderEntity } from '../entities/order.entity';
import { CustomerId } from '../value-objects/customer-id.value-object';
import { OrderItem } from '../value-objects/order-item.value-object';
import { OrderStatus } from '../enums/order-status.enum';
import { Address, Money } from '@tiny-store/shared-domain';

export class OrderRepository {
  private repository: Repository<OrderEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(OrderEntity);
  }

  async save(order: Order): Promise<void> {
    const entity = this.repository.create({
      id: order.id,
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
      status: order.status,
      paymentId: order.paymentId ?? undefined,
      shipmentId: order.shipmentId ?? undefined,
      cancellationReason: order.cancellationReason ?? undefined,
      rejectionReason: order.rejectionReason ?? undefined,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });

    await this.repository.save(entity);
  }

  async findById(id: string): Promise<Order | null> {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      return null;
    }

    return this.toDomain(entity);
  }

  async findByCustomerId(customerId: string): Promise<Order[]> {
    const entities = await this.repository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    const entities = await this.repository.find({
      where: { status },
      order: { createdAt: 'DESC' },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findAll(): Promise<Order[]> {
    const entities = await this.repository.find({
      order: { createdAt: 'DESC' },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  private toDomain(entity: OrderEntity): Order {
    const items = entity.items.map((item) =>
      OrderItem.create(item.sku, item.quantity, Money.create(item.unitPrice))
    );

    const address = Address.create(
      entity.shippingAddress.street,
      entity.shippingAddress.city,
      entity.shippingAddress.state,
      entity.shippingAddress.postalCode,
      entity.shippingAddress.country
    );

    return Order.reconstitute(
      entity.id,
      CustomerId.create(entity.customerId),
      items,
      address,
      entity.status as OrderStatus,
      entity.paymentId ?? null,
      entity.shipmentId ?? null,
      entity.cancellationReason ?? null,
      entity.rejectionReason ?? null,
      entity.createdAt,
      entity.updatedAt
    );
  }
}

