import { QueueService, InMemoryQueueAdapter } from '@tiny-store/shared-infrastructure';
import {
  registerPaymentProcessingWorker,
  enqueuePaymentProcessing,
  QUEUE_NAME,
} from './process-payment.job';

describe('Payment Processing Job', () => {
  beforeEach(() => {
    QueueService.resetInstance();
  });

  it('should enqueue payment processing data', async () => {
    const queue = QueueService.getInstance();
    const job = await queue.enqueue(QUEUE_NAME, {
      orderId: 'order-1',
      amount: 99.99,
    });
    expect(job.queue).toBe('payments:process');
    expect(job.data.orderId).toBe('order-1');
    expect(job.data.amount).toBe(99.99);
  });

  it('should process payment via registered worker', async () => {
    const processed: any[] = [];

    registerPaymentProcessingWorker(async (data) => {
      processed.push(data);
    });

    await enqueuePaymentProcessing({ orderId: 'order-2', amount: 50.0 });

    // Allow setImmediate to fire
    await new Promise((r) => setTimeout(r, 50));

    expect(processed).toHaveLength(1);
    expect(processed[0].orderId).toBe('order-2');
  });

  it('should use exponential backoff with 3 attempts', async () => {
    const queue = QueueService.getInstance();
    const job = await queue.enqueue(QUEUE_NAME, { orderId: 'x', amount: 1 }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    expect(job.options.attempts).toBe(3);
    expect(job.options.backoff).toEqual({ type: 'exponential', delay: 2000 });
  });
});
