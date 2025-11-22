import { DataSource } from 'typeorm';
import { ShipmentRepository } from '../../domain/repositories/shipment.repository';
import { Shipment } from '../../domain/entities/shipment';
import { Address } from '@tiny-store/shared-domain';
import { EventBus } from '@tiny-store/shared-infrastructure';
import { CreateShipmentDto, CreateShipmentResponse } from './dto';
import {
  createShipmentCreatedEvent,
  ShipmentCreatedPayload,
} from '../../domain/events/shipment-created.event';

export class CreateShipmentService {
  private shipmentRepository: ShipmentRepository;
  private eventBus: EventBus;

  constructor(dataSource: DataSource) {
    this.shipmentRepository = new ShipmentRepository(dataSource);
    this.eventBus = EventBus.getInstance();
  }

  async execute(dto: CreateShipmentDto): Promise<CreateShipmentResponse> {
    const address = Address.create(
      dto.shippingAddress.street,
      dto.shippingAddress.city,
      dto.shippingAddress.state,
      dto.shippingAddress.postalCode,
      dto.shippingAddress.country
    );

    const shipment = Shipment.create(dto.orderId, address);

    await this.shipmentRepository.save(shipment);

    // Publish ShipmentCreated event
    const payload: ShipmentCreatedPayload = {
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
    };

    const event = createShipmentCreatedEvent(shipment.id, payload);
    await this.eventBus.publish(event);

    return {
      shipmentId: shipment.id,
      orderId: shipment.orderId,
      trackingNumber: shipment.trackingNumber.value,
      status: shipment.status,
      estimatedDeliveryDate: shipment.estimatedDeliveryDate,
    };
  }
}

