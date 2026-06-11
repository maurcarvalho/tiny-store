/**
 * Exercise G3-1: Synchronous Cross-Module Import
 *
 * This is a modified version of create-shipment/service.ts that adds a
 * synchronous import from the Payments module to check payment status
 * before creating a shipment.
 *
 * WHY THIS VIOLATES G3:
 * - G1 (Guidelines) passes: the code works correctly
 * - G2 (Boundaries) passes: import uses the public entrypoint (@tiny-store/modules-payments)
 * - G3 (Scalability) FAILS: sync coupling ratio rises — Shipments now has a
 *   runtime dependency on Payments. If the Payments module is extracted to a
 *   separate service, this synchronous call cannot be satisfied without a
 *   network hop, breaking the extraction boundary.
 *
 * FIX: Use event-driven communication instead. The OrderPaid event already
 * guarantees payment was processed before the shipment flow begins.
 */

import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { EventBus } from '@tiny-store/shared-infrastructure';

// VIOLATION: synchronous import from another module
import { GetPaymentHandler } from '@tiny-store/modules-payments';

interface CreateShipmentDto {
  orderId: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

/**
 * This service synchronously calls the Payments module to verify payment
 * before creating a shipment — a G3 violation that increases sync coupling.
 */
export class CreateShipmentServiceWithSyncCheck {
  private eventBus: EventBus;
  private getPaymentHandler: GetPaymentHandler;

  constructor(db: DrizzleDb) {
    this.eventBus = EventBus.getInstance();
    // VIOLATION: direct instantiation of another module's handler
    this.getPaymentHandler = new GetPaymentHandler(db);
  }

  async execute(dto: CreateShipmentDto): Promise<void> {
    // VIOLATION: synchronous cross-module call at runtime
    const payment = await this.getPaymentHandler.handle(dto.orderId);
    if (payment.status !== 'PROCESSED') {
      throw new Error('Payment not processed — cannot create shipment');
    }

    // ... rest of shipment creation logic would follow
    console.log(`Shipment created for order ${dto.orderId}`);
  }
}
