import { AggregateRoot, BusinessRuleViolationError, Address } from '@tiny-store/shared-domain';
import { ShipmentStatus } from '../enums/shipment-status.enum';
import { TrackingNumber } from '../value-objects/tracking-number.value-object';
import { v4 as uuidv4 } from 'uuid';

export class Shipment extends AggregateRoot {
  private constructor(
    id: string,
    public readonly orderId: string,
    public readonly trackingNumber: TrackingNumber,
    public readonly shippingAddress: Address,
    public status: ShipmentStatus,
    public dispatchedAt: Date | null,
    public deliveredAt: Date | null,
    public estimatedDeliveryDate: Date | null,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {
    super(id);
  }

  static create(orderId: string, shippingAddress: Address): Shipment {
    const now = new Date();
    const trackingNumber = TrackingNumber.generate();
    const estimatedDeliveryDate = Shipment.calculateEstimatedDeliveryDate();

    return new Shipment(
      uuidv4(),
      orderId,
      trackingNumber,
      shippingAddress,
      ShipmentStatus.PENDING,
      null,
      null,
      estimatedDeliveryDate,
      now,
      now
    );
  }

  static reconstitute(
    id: string,
    orderId: string,
    trackingNumber: TrackingNumber,
    shippingAddress: Address,
    status: ShipmentStatus,
    dispatchedAt: Date | null,
    deliveredAt: Date | null,
    estimatedDeliveryDate: Date | null,
    createdAt: Date,
    updatedAt: Date
  ): Shipment {
    return new Shipment(
      id,
      orderId,
      trackingNumber,
      shippingAddress,
      status,
      dispatchedAt,
      deliveredAt,
      estimatedDeliveryDate,
      createdAt,
      updatedAt
    );
  }

  private static calculateEstimatedDeliveryDate(): Date {
    const now = new Date();
    const daysToAdd = 3 + Math.floor(Math.random() * 4); // 3-6 days
    now.setDate(now.getDate() + daysToAdd);
    return now;
  }

  dispatch(): void {
    if (this.status !== ShipmentStatus.PENDING) {
      throw new BusinessRuleViolationError(
        `Cannot dispatch shipment in ${this.status} status`
      );
    }

    this.status = ShipmentStatus.IN_TRANSIT;
    this.dispatchedAt = new Date();
    this.updatedAt = new Date();
  }

  markAsDelivered(): void {
    if (this.status !== ShipmentStatus.IN_TRANSIT) {
      throw new BusinessRuleViolationError(
        `Cannot mark shipment as delivered in ${this.status} status`
      );
    }

    this.status = ShipmentStatus.DELIVERED;
    this.deliveredAt = new Date();
    this.updatedAt = new Date();
  }

  canBeDispatched(): boolean {
    return this.status === ShipmentStatus.PENDING;
  }

  updateTracking(status: ShipmentStatus): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  isDelayed(): boolean {
    if (!this.estimatedDeliveryDate || this.status === ShipmentStatus.DELIVERED) {
      return false;
    }

    return new Date() > this.estimatedDeliveryDate;
  }
}

