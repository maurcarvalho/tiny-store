/**
 * Payment Processing Job — Async payment dispatch via QueueService.
 *
 * Queue: payments:process
 * Retry: 3 attempts, exponential backoff (2 s base).
 *
 * Payment gateway calls (Stripe, Adyen, etc.) are inherently unreliable:
 * network timeouts, rate limits, and transient failures are common.
 * Queuing payment processing with retry ensures that a temporary gateway
 * outage does not block the order confirmation flow.
 */

import { QueueService, Job } from '@tiny-store/shared-infrastructure';

const QUEUE_NAME = 'payments:process';

interface PaymentProcessingData {
  orderId: string;
  amount: number;
}

/**
 * Registers the worker that processes payment jobs.
 * Call once during application bootstrap.
 */
function registerPaymentProcessingWorker(
  processPayment: (data: PaymentProcessingData) => Promise<void>,
): void {
  const queue = QueueService.getInstance();

  queue.registerWorker<PaymentProcessingData>(
    QUEUE_NAME,
    async (job: Job<PaymentProcessingData>) => {
      console.log(
        `[PaymentProcessing] Processing payment for order ${job.data.orderId}, amount ${job.data.amount}`,
      );
      await processPayment(job.data);
    },
  );
}

/**
 * Enqueue a payment for async processing.
 */
async function enqueuePaymentProcessing(data: PaymentProcessingData): Promise<void> {
  const queue = QueueService.getInstance();
  await queue.enqueue(QUEUE_NAME, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
}

export {
  registerPaymentProcessingWorker,
  enqueuePaymentProcessing,
  PaymentProcessingData,
  QUEUE_NAME,
};
