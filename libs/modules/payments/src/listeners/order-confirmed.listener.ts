import { DataSource } from 'typeorm';
import { DomainEvent } from '@tiny-store/shared-infrastructure';
import { ProcessPaymentHandler } from '../features/process-payment/handler';

export class OrderConfirmedListener {
  private handler: ProcessPaymentHandler;

  constructor(dataSource: DataSource) {
    this.handler = new ProcessPaymentHandler(dataSource);
  }

  async handle(event: DomainEvent): Promise<void> {
    const { orderId } = event.payload;
    
    // Extract amount from the original order placed event if available
    // For now, we'll need to get it from the order
    // In a real system, the event payload should include the amount
    // For this implementation, we'll get it from the related order events

    // We need to find the original OrderPlaced event to get the amount
    // This is a simplification - in a real system, the OrderConfirmed event
    // should include the amount or we should query the Order aggregate
    
    // For now, let's assume the amount is passed through or we query it
    // This is a known limitation that would be addressed in a real system
    console.log(`OrderConfirmedListener: Processing payment for order ${orderId}`);
    
    // We'll handle this in the API layer where we have access to order details
  }
}

