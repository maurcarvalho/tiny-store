import { proxyActivities } from '@temporalio/workflow';
import type { OrderActivities } from './activities';
import type { OrderInput, OrderFulfillmentResult } from './types';

const {
  reserveInventory,
  releaseInventory,
  processPayment,
  refundPayment,
  createShipment,
} = proxyActivities<OrderActivities>({
  startToCloseTimeout: '30s',
  retry: { maximumAttempts: 3 },
});

export async function orderFulfillmentWorkflow(
  input: OrderInput
): Promise<OrderFulfillmentResult> {
  const reservation = await reserveInventory(input);
  if (!reservation.success) {
    return { success: false, reason: 'inventory-unavailable' };
  }

  try {
    const payment = await processPayment(input);
    if (!payment.success) {
      await releaseInventory(input);
      return { success: false, reason: 'payment-declined' };
    }

    const shipment = await createShipment(input);
    return { success: true, trackingNumber: shipment.trackingNumber };
  } catch (err) {
    await refundPayment(input);
    await releaseInventory(input);
    throw err;
  }
}
