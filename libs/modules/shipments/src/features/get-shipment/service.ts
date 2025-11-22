import { DataSource } from 'typeorm';
import { ShipmentRepository } from '../../domain/repositories/shipment.repository';
import { NotFoundError } from '@tiny-store/shared-domain';
import { GetShipmentResponse } from './dto';

export class GetShipmentService {
  private shipmentRepository: ShipmentRepository;

  constructor(dataSource: DataSource) {
    this.shipmentRepository = new ShipmentRepository(dataSource);
  }

  async execute(shipmentId: string): Promise<GetShipmentResponse> {
    const shipment = await this.shipmentRepository.findById(shipmentId);

    if (!shipment) {
      throw new NotFoundError(`Shipment ${shipmentId} not found`);
    }

    return {
      shipmentId: shipment.id,
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
      dispatchedAt: shipment.dispatchedAt,
      deliveredAt: shipment.deliveredAt,
      estimatedDeliveryDate: shipment.estimatedDeliveryDate,
      isDelayed: shipment.isDelayed(),
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    };
  }
}

