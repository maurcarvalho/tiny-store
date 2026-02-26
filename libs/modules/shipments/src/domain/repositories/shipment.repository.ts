import { eq } from 'drizzle-orm';
import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { shipmentsTable } from '../../db/schema';
import { Shipment } from '../entities/shipment';
import { TrackingNumber } from '../value-objects/tracking-number.value-object';
import { ShipmentStatus } from '../enums/shipment-status.enum';
import { Address } from '@tiny-store/shared-domain';

export class ShipmentRepository {
  constructor(private db: DrizzleDb) {}

  async save(shipment: Shipment): Promise<void> {
    await this.db.insert(shipmentsTable).values({
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
      dispatchedAt: shipment.dispatchedAt ?? null,
      deliveredAt: shipment.deliveredAt ?? null,
      estimatedDeliveryDate: shipment.estimatedDeliveryDate ?? null,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    }).onConflictDoUpdate({
      target: shipmentsTable.id,
      set: {
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
        dispatchedAt: shipment.dispatchedAt ?? null,
        deliveredAt: shipment.deliveredAt ?? null,
        estimatedDeliveryDate: shipment.estimatedDeliveryDate ?? null,
        updatedAt: shipment.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<Shipment | null> {
    const rows = await this.db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id));
    return rows.length > 0 ? this.toDomain(rows[0]) : null;
  }

  async findByOrderId(orderId: string): Promise<Shipment | null> {
    const rows = await this.db.select().from(shipmentsTable).where(eq(shipmentsTable.orderId, orderId));
    return rows.length > 0 ? this.toDomain(rows[0]) : null;
  }

  async findByTrackingNumber(trackingNumber: string): Promise<Shipment | null> {
    const rows = await this.db.select().from(shipmentsTable).where(eq(shipmentsTable.trackingNumber, trackingNumber));
    return rows.length > 0 ? this.toDomain(rows[0]) : null;
  }

  private toDomain(row: typeof shipmentsTable.$inferSelect): Shipment {
    const addr = row.shippingAddress as { street: string; city: string; state: string; postalCode: string; country: string };
    const trackingNumber = TrackingNumber.create(row.trackingNumber);
    const address = Address.create(
      addr.street,
      addr.city,
      addr.state,
      addr.postalCode,
      addr.country
    );

    return Shipment.reconstitute(
      row.id,
      row.orderId,
      trackingNumber,
      address,
      row.status as ShipmentStatus,
      row.dispatchedAt ?? null,
      row.deliveredAt ?? null,
      row.estimatedDeliveryDate ?? null,
      row.createdAt,
      row.updatedAt
    );
  }
}
