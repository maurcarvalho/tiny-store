import { QueueService, InMemoryQueueAdapter } from './queue.service';

describe('QueueService', () => {
  beforeEach(() => {
    QueueService.resetInstance();
  });

  it('should be a singleton', () => {
    const a = QueueService.getInstance();
    const b = QueueService.getInstance();
    expect(a).toBe(b);
  });

  it('should enqueue a job and return job metadata', async () => {
    const queue = QueueService.getInstance();
    const job = await queue.enqueue('orders:email', { orderId: '1' });
    expect(job.id).toBeDefined();
    expect(job.queue).toBe('orders:email');
    expect(job.data).toEqual({ orderId: '1' });
  });

  it('should process jobs with registered worker', async () => {
    const queue = QueueService.getInstance();
    const processed: any[] = [];

    queue.registerWorker('orders:email', async (job) => {
      processed.push(job.data);
    });

    await queue.enqueue('orders:email', { orderId: '1' });

    // Wait for setImmediate processing
    await new Promise((r) => setTimeout(r, 50));
    expect(processed).toEqual([{ orderId: '1' }]);
  });

  it('should support job options (attempts, backoff)', async () => {
    const queue = QueueService.getInstance();
    const job = await queue.enqueue('orders:email', { orderId: '1' }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
    expect(job.options.attempts).toBe(3);
    expect(job.options.backoff?.type).toBe('exponential');
  });
});
