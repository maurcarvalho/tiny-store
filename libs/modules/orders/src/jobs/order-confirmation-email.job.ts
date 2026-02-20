/**
 * Order Confirmation Email Job — Async email dispatch via QueueService.
 *
 * Queue: orders:confirmation-email
 * Retry: 3 attempts, exponential backoff (1 s base).
 */

import { QueueService, Job } from '@tiny-store/shared-infrastructure';

const QUEUE_NAME = 'orders:confirmation-email';

interface OrderConfirmationData {
  orderId: string;
  customerEmail: string;
  totalAmount: number;
}

/**
 * Registers the worker that processes order confirmation email jobs.
 * Call once during application bootstrap.
 */
function registerOrderConfirmationWorker(): void {
  const queue = QueueService.getInstance();

  queue.registerWorker<OrderConfirmationData>(QUEUE_NAME, async (job: Job<OrderConfirmationData>) => {
    // In a real implementation this would call an email service.
    console.log(
      `[OrderConfirmationEmail] Sending confirmation for order ${job.data.orderId} to ${job.data.customerEmail}`
    );
  });
}

/**
 * Enqueue an order confirmation email for async processing.
 */
async function enqueueOrderConfirmation(data: OrderConfirmationData): Promise<void> {
  const queue = QueueService.getInstance();
  await queue.enqueue(QUEUE_NAME, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

export {
  registerOrderConfirmationWorker,
  enqueueOrderConfirmation,
  OrderConfirmationData,
  QUEUE_NAME,
};
