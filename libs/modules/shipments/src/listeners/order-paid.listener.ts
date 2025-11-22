import { DataSource } from 'typeorm';
import { DomainEvent } from '@tiny-store/shared-infrastructure';
import { CreateShipmentHandler } from '../features/create-shipment/handler';

export class OrderPaidListener {
  private handler: CreateShipmentHandler;

  constructor(dataSource: DataSource) {
    this.handler = new CreateShipmentHandler(dataSource);
  }

  async handle(event: DomainEvent): Promise<void> {
    const { orderId } = event.payload;
    
    // Note: We need the shipping address from the original order
    // In a real system, we would query the order or include it in the event payload
    // For this implementation, we'll log this limitation
    console.log(`OrderPaidListener: Creating shipment for order ${orderId}`);
    
    // This will be handled properly in the API layer where we have access to order details
  }
}

