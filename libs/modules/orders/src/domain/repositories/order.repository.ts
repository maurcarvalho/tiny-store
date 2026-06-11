import { eq, desc } from 'drizzle-orm';
import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { ordersTable } from '../../db/schema';
import { Order } from '../entities/order';
import { CustomerId } from '../value-objects/customer-id.value-object';
import { OrderItem } from '../value-objects/order-item.value-object';
import { OrderStatus } from '../enums/order-status.enum';
import { Address, Money } from '@tiny-store/shared-domain';

export class OrderRepository {
  constructor(private db: DrizzleDb) {}

  async save(order: Order): Promise<void> {
    await this.db.insert(ordersTable).values({
      id: order.id,
      customerId: order.customerId.value,
      items: order.items.map((item) => ({
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice.amount,
      })),
      totalAmount: String(order.calculateTotal().amount),
      shippingAddress: {
        street: order.shippingAddress.street,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        postalCode: order.shippingAddress.postalCode,
        country: order.shippingAddress.country,
      },
      status: order.status,
      paymentId: order.paymentId ?? null,
      shipmentId: order.shipmentId ?? null,
      cancellationReason: order.cancellationReason ?? null,
      rejectionReason: order.rejectionReason ?? null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }).onConflictDoUpdate({
      target: ordersTable.id,
      set: {
        customerId: order.customerId.value,
        items: order.items.map((item) => ({
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice.amount,
        })),
        totalAmount: String(order.calculateTotal().amount),
        shippingAddress: {
          street: order.shippingAddress.street,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          postalCode: order.shippingAddress.postalCode,
          country: order.shippingAddress.country,
        },
        status: order.status,
        paymentId: order.paymentId ?? null,
        shipmentId: order.shipmentId ?? null,
        cancellationReason: order.cancellationReason ?? null,
        rejectionReason: order.rejectionReason ?? null,
        updatedAt: order.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<Order | null> {
    const rows = await this.db.select().from(ordersTable).where(eq(ordersTable.id, id));
    return rows.length > 0 ? this.toDomain(rows[0]) : null;
  }

  async findByCustomerId(customerId: string): Promise<Order[]> {
    const rows = await this.db.select().from(ordersTable)
      .where(eq(ordersTable.customerId, customerId))
      .orderBy(desc(ordersTable.createdAt));
    return rows.map((row) => this.toDomain(row));
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    const rows = await this.db.select().from(ordersTable)
      .where(eq(ordersTable.status, status))
      .orderBy(desc(ordersTable.createdAt));
    return rows.map((row) => this.toDomain(row));
  }

  async findAll(): Promise<Order[]> {
    const rows = await this.db.select().from(ordersTable)
      .orderBy(desc(ordersTable.createdAt));
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: typeof ordersTable.$inferSelect): Order {
    const items = (row.items as Array<{ sku: string; quantity: number; unitPrice: number }>).map((item) =>
      OrderItem.create(item.sku, item.quantity, Money.create(item.unitPrice))
    );

    const addr = row.shippingAddress as { street: string; city: string; state: string; postalCode: string; country: string };
    const address = Address.create(
      addr.street,
      addr.city,
      addr.state,
      addr.postalCode,
      addr.country
    );

    return Order.reconstitute(
      row.id,
      CustomerId.create(row.customerId),
      items,
      address,
      row.status as OrderStatus,
      row.paymentId ?? null,
      row.shipmentId ?? null,
      row.cancellationReason ?? null,
      row.rejectionReason ?? null,
      row.createdAt,
      row.updatedAt
    );
  }
}
