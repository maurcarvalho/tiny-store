import { AggregateRoot, BusinessRuleViolationError, Money, Address } from '@tiny-store/shared-domain';
import { OrderStatus } from '../enums/order-status.enum';
import { CustomerId } from '../value-objects/customer-id.value-object';
import { OrderItem } from '../value-objects/order-item.value-object';
import { v4 as uuidv4 } from 'uuid';

export class Order extends AggregateRoot {
  private constructor(
    id: string,
    public readonly customerId: CustomerId,
    public readonly items: OrderItem[],
    public readonly shippingAddress: Address,
    public status: OrderStatus,
    public paymentId: string | null,
    public shipmentId: string | null,
    public cancellationReason: string | null,
    public rejectionReason: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {
    super(id);
  }

  static create(
    customerId: CustomerId,
    items: OrderItem[],
    shippingAddress: Address
  ): Order {
    if (items.length === 0) {
      throw new BusinessRuleViolationError('Order must have at least one item');
    }

    const now = new Date();
    return new Order(
      uuidv4(),
      customerId,
      items,
      shippingAddress,
      OrderStatus.PENDING,
      null,
      null,
      null,
      null,
      now,
      now
    );
  }

  static reconstitute(
    id: string,
    customerId: CustomerId,
    items: OrderItem[],
    shippingAddress: Address,
    status: OrderStatus,
    paymentId: string | null,
    shipmentId: string | null,
    cancellationReason: string | null,
    rejectionReason: string | null,
    createdAt: Date,
    updatedAt: Date
  ): Order {
    return new Order(
      id,
      customerId,
      items,
      shippingAddress,
      status,
      paymentId,
      shipmentId,
      cancellationReason,
      rejectionReason,
      createdAt,
      updatedAt
    );
  }

  calculateTotal(): Money {
    return this.items.reduce(
      (total, item) => total.add(item.totalPrice),
      Money.create(0)
    );
  }

  confirm(): void {
    if (this.status !== OrderStatus.PENDING) {
      throw new BusinessRuleViolationError(
        `Cannot confirm order in ${this.status} status`
      );
    }

    this.status = OrderStatus.CONFIRMED;
    this.updatedAt = new Date();
  }

  reject(reason: string): void {
    if (this.status !== OrderStatus.PENDING) {
      throw new BusinessRuleViolationError(
        `Cannot reject order in ${this.status} status`
      );
    }

    this.status = OrderStatus.REJECTED;
    this.rejectionReason = reason;
    this.updatedAt = new Date();
  }

  markAsPaid(paymentId: string): void {
    if (this.status !== OrderStatus.CONFIRMED) {
      throw new BusinessRuleViolationError(
        `Cannot mark order as paid in ${this.status} status`
      );
    }

    this.status = OrderStatus.PAID;
    this.paymentId = paymentId;
    this.updatedAt = new Date();
  }

  markPaymentFailed(reason: string): void {
    if (this.status !== OrderStatus.CONFIRMED) {
      throw new BusinessRuleViolationError(
        `Cannot mark payment as failed in ${this.status} status`
      );
    }

    this.status = OrderStatus.PAYMENT_FAILED;
    this.updatedAt = new Date();
  }

  markAsShipped(shipmentId: string): void {
    if (this.status !== OrderStatus.PAID) {
      throw new BusinessRuleViolationError(
        `Cannot mark order as shipped in ${this.status} status`
      );
    }

    this.status = OrderStatus.SHIPPED;
    this.shipmentId = shipmentId;
    this.updatedAt = new Date();
  }

  cancel(reason: string): void {
    if (!this.canBeCancelled()) {
      throw new BusinessRuleViolationError(
        `Cannot cancel order in ${this.status} status`
      );
    }

    this.status = OrderStatus.CANCELLED;
    this.cancellationReason = reason;
    this.updatedAt = new Date();
  }

  canBeCancelled(): boolean {
    return (
      this.status === OrderStatus.PENDING ||
      this.status === OrderStatus.CONFIRMED ||
      this.status === OrderStatus.PAID
    );
  }

  isPending(): boolean {
    return this.status === OrderStatus.PENDING;
  }

  isConfirmed(): boolean {
    return this.status === OrderStatus.CONFIRMED;
  }

  isPaid(): boolean {
    return this.status === OrderStatus.PAID;
  }

  isShipped(): boolean {
    return this.status === OrderStatus.SHIPPED;
  }

  isCancelled(): boolean {
    return this.status === OrderStatus.CANCELLED;
  }

  isRejected(): boolean {
    return this.status === OrderStatus.REJECTED;
  }
}

