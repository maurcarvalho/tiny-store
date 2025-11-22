import { DataSource, Repository } from 'typeorm';
import { Shipment } from '../entities/shipment';
import { ShipmentEntity } from '../entities/shipment.entity';
import { TrackingNumber } from '../value-objects/tracking-number.value-object';
import { ShipmentStatus } from '../enums/shipment-status.enum';
import { Address } from '@tiny-store/shared-domain';

export class ShipmentRepository {
  private repository: Repository<ShipmentEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(ShipmentEntity);
  }

  async save(shipment: Shipment): Promise<void> {
    const entity = this.repository.create({
      id: shipment.id,
      orderId: shipment.orderId,
      trackingNumber: shipment.trackingNumber.value,
      shippingAddress: {
        street: shipment.shippingAddress.street,
        city: shipment.shippingAddress.city,
        state: shipment.shippingAddress.state,
        postalCode: shipment.shippingAddress.postalCode,
        country: shipment.shippingAddress.country,
      },
      status: shipment.status,
      dispatchedAt: shipment.dispatchedAt ?? undefined,
      deliveredAt: shipment.deliveredAt ?? undefined,
      estimatedDeliveryDate: shipment.estimatedDeliveryDate ?? undefined,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    });

    await this.repository.save(entity);
  }

  async findById(id: string): Promise<Shipment | null> {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      return null;
    }

    return this.toDomain(entity);
  }

  async findByOrderId(orderId: string): Promise<Shipment | null> {
    const entity = await this.repository.findOne({ where: { orderId } });

    if (!entity) {
      return null;
    }

    return this.toDomain(entity);
  }

  async findByTrackingNumber(trackingNumber: string): Promise<Shipment | null> {
    const entity = await this.repository.findOne({ where: { trackingNumber } });

    if (!entity) {
      return null;
    }

    return this.toDomain(entity);
  }

  private toDomain(entity: ShipmentEntity): Shipment {
    const trackingNumber = TrackingNumber.create(entity.trackingNumber);
    const address = Address.create(
      entity.shippingAddress.street,
      entity.shippingAddress.city,
      entity.shippingAddress.state,
      entity.shippingAddress.postalCode,
      entity.shippingAddress.country
    );

    return Shipment.reconstitute(
      entity.id,
      entity.orderId,
      trackingNumber,
      address,
      entity.status as ShipmentStatus,
      entity.dispatchedAt ?? null,
      entity.deliveredAt ?? null,
      entity.estimatedDeliveryDate ?? null,
      entity.createdAt,
      entity.updatedAt
    );
  }
}

