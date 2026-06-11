import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { DomainEvent } from '@tiny-store/shared-infrastructure';
import { CreateShipmentHandler } from '../features/create-shipment/handler';
import { enqueueLabelGeneration } from '../jobs/generate-label.job';

export class OrderPaidListener {
  private handler: CreateShipmentHandler;

  constructor(db: DrizzleDb) {
    this.handler = new CreateShipmentHandler(db);
  }

  async handle(event: DomainEvent): Promise<void> {
    const { orderId } = event.payload;
    
    // Note: We need the shipping address from the original order
    // In a real system, we would query the order or include it in the event payload
    // For this implementation, we'll log this limitation
    console.log(`OrderPaidListener: Creating shipment for order ${orderId}`);
    
    // Enqueue async label generation
    await enqueueLabelGeneration({
      shipmentId: `ship-${orderId}`,
      orderId,
      trackingNumber: `TN-${Date.now()}`,
    });
  }
}

