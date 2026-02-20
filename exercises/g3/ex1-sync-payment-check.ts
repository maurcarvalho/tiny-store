/**
 * Exercise 1: Synchronous Cross-Module Call (ρ_sync degradation)
 *
 * This is a MODIFIED version of:
 *   libs/modules/shipments/src/features/create-shipment/service.ts
 *
 * VIOLATION: Directly imports and calls GetPaymentHandler from the payments
 * module to verify payment status before creating a shipment. This introduces
 * a synchronous cross-module dependency that couples shipments → payments at
 * the source level.
 *
 * WHY G1 PASSES: The import uses the public entrypoint (@tiny-store/modules-payments),
 * so G1 boundary tests see no encapsulation leak.
 *
 * WHY G2 PASSES: The dependency goes through a public API handler, so
 * maintainability metrics (ρ_api, fan-in) remain within thresholds.
 *
 * WHAT G3 CATCHES: ρ_sync rises from 0.0 because there is now a synchronous
 * import from another module inside a module's source code. If shipments were
 * extracted to a separate service, this call would require a network hop and
 * the payments module would need to be co-deployed or exposed as an API.
 *
 * Metric impact: ρ_sync ↑ (from 0.0 to ~0.04)
 *
 * FIX: Enrich the OrderPaid event payload to include payment status/ID, so
 * the shipments module receives everything it needs through async events.
 */

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

// ❌ VIOLATION: synchronous cross-module import
import { GetPaymentHandler } from '@tiny-store/modules-payments';

export class CreateShipmentService {
  private shipmentRepository: ShipmentRepository;
  private eventBus: EventBus;
  private getPaymentHandler: GetPaymentHandler; // ❌ direct dependency on payments

  constructor(dataSource: DataSource) {
    this.shipmentRepository = new ShipmentRepository(dataSource);
    this.eventBus = EventBus.getInstance();
    this.getPaymentHandler = new GetPaymentHandler(dataSource); // ❌
  }

  async execute(dto: CreateShipmentDto): Promise<CreateShipmentResponse> {
    // ❌ VIOLATION: synchronous cross-module call to verify payment
    const payment = await this.getPaymentHandler.handle(dto.orderId);
    if (payment.status !== 'processed') {
      throw new Error(`Payment not confirmed for order ${dto.orderId}`);
    }

    const address = Address.create(
      dto.shippingAddress.street,
      dto.shippingAddress.city,
      dto.shippingAddress.state,
      dto.shippingAddress.postalCode,
      dto.shippingAddress.country
    );

    const shipment = Shipment.create(dto.orderId, address);
    await this.shipmentRepository.save(shipment);

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
