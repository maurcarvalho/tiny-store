import { QueueService, BullMQAdapter } from '../../libs/shared/infrastructure/src/queue/queue.service';
import { QueueEvents } from 'bullmq';
import Redis from 'ioredis';

const REDIS = { host: 'localhost', port: 6379 };

describe('Queue Integration (BullMQ + Redis)', () => {
  let redis: Redis;
  let queueService: QueueService;
  let adapter: BullMQAdapter;

  beforeAll(async () => {
    redis = new Redis(REDIS);
    await redis.flushall();
  });

  beforeEach(() => {
    QueueService.resetInstance();
    queueService = QueueService.getInstance({ adapter: 'bullmq', redis: REDIS });
    adapter = queueService.getAdapter() as BullMQAdapter;
  });

  afterEach(async () => {
    await queueService.close();
  });

  afterAll(async () => {
    await redis.flushall();
    redis.disconnect();
  });

  async function getQE(name: string): Promise<QueueEvents> {
    const qe = adapter.getQueueEvents(name);
    await qe.waitUntilReady();
    return qe;
  }

  function waitCompleted(qe: QueueEvents, jobId: string, ms = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`Timeout completed:${jobId}`)), ms);
      qe.on('completed', (args: { jobId: string }) => {
        if (args.jobId === jobId) { clearTimeout(t); resolve(); }
      });
    });
  }

  function waitFailed(qe: QueueEvents, jobId: string, ms = 15000): Promise<void> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`Timeout failed:${jobId}`)), ms);
      qe.on('failed', (args: { jobId: string }) => {
        if (args.jobId === jobId) { clearTimeout(t); resolve(); }
      });
    });
  }

  function waitN(qe: QueueEvents, n: number, ms = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`Timeout ${n}x completed`)), ms);
      let c = 0;
      qe.on('completed', () => { if (++c >= n) { clearTimeout(t); resolve(); } });
    });
  }

  it('should enqueue and process a job via BullMQ', async () => {
    const processed: any[] = [];
    queueService.registerWorker('t1-basic', async (job) => { processed.push(job.data); });

    const qe = await getQE('t1-basic');
    const job = await queueService.enqueue('t1-basic', { hello: 'world' });
    await waitCompleted(qe, job.id);
    expect(processed).toEqual([{ hello: 'world' }]);
  });

  it('should retry failed jobs with exponential backoff', async () => {
    let attempts = 0;
    queueService.registerWorker('t2-retry', async () => {
      attempts++;
      if (attempts < 3) throw new Error('fail');
    });

    const qe = await getQE('t2-retry');
    const job = await queueService.enqueue('t2-retry', {}, {
      attempts: 3, backoff: { type: 'exponential', delay: 100 },
    });
    await waitCompleted(qe, job.id, 15000);
    expect(attempts).toBe(3);
  });

  it('should move job to failed after exhausting retries', async () => {
    queueService.registerWorker('t3-fail', async () => { throw new Error('always'); });

    const qe = await getQE('t3-fail');
    const job = await queueService.enqueue('t3-fail', {}, {
      attempts: 2, backoff: { type: 'fixed', delay: 100 },
    });
    await waitFailed(qe, job.id);

    const failed = await adapter.getQueueInstance('t3-fail').getFailed();
    expect(failed.some(j => j.id === job.id)).toBe(true);
  });

  it('should process jobs from multiple queues independently', async () => {
    const r1: any[] = [];
    const r2: any[] = [];
    queueService.registerWorker('t4-pay', async (j) => { r1.push(j.data); });
    queueService.registerWorker('t4-ship', async (j) => { r2.push(j.data); });

    const qe1 = await getQE('t4-pay');
    const qe2 = await getQE('t4-ship');

    // Set up listeners BEFORE enqueuing to avoid race conditions
    const p1 = new Promise<string>((resolve) => {
      qe1.on('completed', (args: { jobId: string }) => resolve(args.jobId));
    });
    const p2 = new Promise<string>((resolve) => {
      qe2.on('completed', (args: { jobId: string }) => resolve(args.jobId));
    });

    const j1 = await queueService.enqueue('t4-pay', { a: 1 });
    const j2 = await queueService.enqueue('t4-ship', { b: 2 });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout multi-queue')), 10000)
    );
    await Promise.race([Promise.all([p1, p2]), timeout]);
    expect(r1).toEqual([{ a: 1 }]);
    expect(r2).toEqual([{ b: 2 }]);
  });

  it('should pick up waiting jobs when a new worker starts', async () => {
    // Enqueue a job with NO worker registered yet
    const bq = adapter.getQueueInstance('t5-pickup');
    await bq.add('job', { id: 'waiting-job' }, { attempts: 1 });

    // Verify it's in waiting state
    const waiting = await bq.getWaiting();
    expect(waiting.length).toBe(1);

    // Now register a worker — it should pick up the waiting job
    const processed: string[] = [];
    const qe = await getQE('t5-pickup');
    const done = new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Timeout pickup')), 10000);
      qe.on('completed', () => { clearTimeout(t); resolve(); });
    });

    queueService.registerWorker('t5-pickup', async (job) => {
      processed.push((job.data as any).id);
    });

    await done;
    expect(processed).toContain('waiting-job');
  });

  it('should respect queue ordering (FIFO)', async () => {
    const order: number[] = [];
    const qe = await getQE('t6-fifo');
    for (let i = 0; i < 5; i++) await queueService.enqueue('t6-fifo', { seq: i });

    const p = waitN(qe, 5);
    queueService.registerWorker('t6-fifo', async (job) => { order.push((job.data as any).seq); });
    await p;
    expect(order).toEqual([0, 1, 2, 3, 4]);
  });

  it('should handle concurrent workers', async () => {
    const processed = new Set<number>();
    queueService.registerWorker('t7-conc', async (j) => {
      await new Promise(r => setTimeout(r, 50));
      processed.add((j.data as any).seq);
    });
    queueService.registerWorker('t7-conc', async (j) => {
      await new Promise(r => setTimeout(r, 50));
      processed.add((j.data as any).seq);
    });

    const qe = await getQE('t7-conc');
    for (let i = 0; i < 6; i++) await queueService.enqueue('t7-conc', { seq: i });

    await waitN(qe, 6);
    expect(processed.size).toBe(6);
  });
});
