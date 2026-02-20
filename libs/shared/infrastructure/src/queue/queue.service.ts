/**
 * QueueService — Module-scoped job queues with in-memory fallback.
 *
 * Queue names follow the convention `module:purpose`.
 * Supports both in-memory (default) and BullMQ-backed (Redis) adapters.
 */

import { Queue as BullQueue, Worker as BullWorker, Job as BullJob, QueueEvents } from 'bullmq';

interface JobOptions {
  attempts?: number;
  backoff?: { type: 'exponential' | 'fixed'; delay: number };
}

interface Job<T = any> {
  id: string;
  queue: string;
  data: T;
  options: JobOptions;
}

type WorkerHandler<T = any> = (job: Job<T>) => Promise<void>;

interface QueueAdapter {
  enqueue<T>(queue: string, data: T, options?: JobOptions): Promise<Job<T>>;
  registerWorker<T>(queue: string, handler: WorkerHandler<T>): void;
  close?(): Promise<void>;
}

interface QueueServiceConfig {
  adapter: 'memory' | 'bullmq';
  redis?: { host: string; port: number };
}

class InMemoryQueueAdapter implements QueueAdapter {
  private jobCounter = 0;
  private workers = new Map<string, WorkerHandler>();
  private jobs: Job[] = [];

  async enqueue<T>(queue: string, data: T, options: JobOptions = {}): Promise<Job<T>> {
    const job: Job<T> = {
      id: String(++this.jobCounter),
      queue,
      data,
      options,
    };
    this.jobs.push(job);

    const handler = this.workers.get(queue);
    if (handler) {
      setImmediate(async () => {
        let attempts = options.attempts ?? 1;
        for (let i = 0; i < attempts; i++) {
          try {
            await handler(job);
            break;
          } catch (err) {
            if (i === attempts - 1) {
              console.error(`Job ${job.id} on ${queue} failed after ${attempts} attempts:`, err);
            }
          }
        }
      });
    }

    return job;
  }

  registerWorker<T>(queue: string, handler: WorkerHandler<T>): void {
    this.workers.set(queue, handler as WorkerHandler);
  }

  /** Test helper */
  getJobs(): Job[] {
    return [...this.jobs];
  }

  clear(): void {
    this.jobs = [];
    this.workers.clear();
    this.jobCounter = 0;
  }
}

class BullMQAdapter implements QueueAdapter {
  private queues = new Map<string, BullQueue>();
  private workers: BullWorker[] = [];
  private queueEvents: QueueEvents[] = [];
  private connection: { host: string; port: number };

  constructor(redis: { host: string; port: number }) {
    this.connection = redis;
  }

  /** BullMQ disallows ':' in queue names — use '.' as separator */
  private sanitizeName(name: string): string {
    return name.replace(/:/g, '.');
  }

  private getQueue(name: string): BullQueue {
    const safeName = this.sanitizeName(name);
    let q = this.queues.get(safeName);
    if (!q) {
      q = new BullQueue(safeName, { connection: { ...this.connection, maxRetriesPerRequest: null } });
      this.queues.set(safeName, q);
    }
    return q;
  }

  async enqueue<T>(queue: string, data: T, options: JobOptions = {}): Promise<Job<T>> {
    const q = this.getQueue(queue);
    const bullOpts: any = {
      attempts: options.attempts ?? 1,
      removeOnComplete: true,
      removeOnFail: false,
    };
    if (options.backoff) {
      bullOpts.backoff = {
        type: options.backoff.type,
        delay: options.backoff.delay,
      };
    }
    const bullJob = await q.add('job', data, bullOpts);
    return {
      id: bullJob.id!,
      queue,
      data,
      options,
    };
  }

  registerWorker<T>(queue: string, handler: WorkerHandler<T>): void {
    const worker = new BullWorker(
      this.sanitizeName(queue),
      async (bullJob: BullJob) => {
        const job: Job<T> = {
          id: bullJob.id!,
          queue,
          data: bullJob.data as T,
          options: {
            attempts: bullJob.opts.attempts,
            backoff: bullJob.opts.backoff as JobOptions['backoff'],
          },
        };
        await handler(job);
      },
      { connection: { ...this.connection, maxRetriesPerRequest: null } }
    );
    this.workers.push(worker);
  }

  getQueueInstance(name: string): BullQueue {
    return this.getQueue(name);
  }

  getQueueEvents(name: string): QueueEvents {
    const qe = new QueueEvents(this.sanitizeName(name), { connection: { ...this.connection, maxRetriesPerRequest: null } });
    this.queueEvents.push(qe);
    return qe;
  }

  async close(): Promise<void> {
    for (const w of this.workers) {
      await w.close();
    }
    for (const qe of this.queueEvents) {
      await qe.close();
    }
    for (const [, q] of this.queues) {
      await q.close();
    }
    this.workers = [];
    this.queueEvents = [];
    this.queues.clear();
  }
}

class QueueService {
  private static instance: QueueService;
  private adapter: QueueAdapter;

  private constructor(adapter?: QueueAdapter) {
    this.adapter = adapter ?? new InMemoryQueueAdapter();
  }

  static getInstance(configOrAdapter?: QueueAdapter | QueueServiceConfig): QueueService {
    if (!QueueService.instance) {
      let adapter: QueueAdapter | undefined;
      if (configOrAdapter && 'adapter' in configOrAdapter) {
        const config = configOrAdapter as QueueServiceConfig;
        if (config.adapter === 'bullmq') {
          adapter = new BullMQAdapter(config.redis ?? { host: 'localhost', port: 6379 });
        } else {
          adapter = new InMemoryQueueAdapter();
        }
      } else if (configOrAdapter) {
        adapter = configOrAdapter as QueueAdapter;
      }
      QueueService.instance = new QueueService(adapter);
    }
    return QueueService.instance;
  }

  static resetInstance(): void {
    QueueService.instance = undefined as any;
  }

  async enqueue<T>(queue: string, data: T, options?: JobOptions): Promise<Job<T>> {
    return this.adapter.enqueue(queue, data, options);
  }

  registerWorker<T>(queue: string, handler: WorkerHandler<T>): void {
    this.adapter.registerWorker(queue, handler);
  }

  getAdapter(): QueueAdapter {
    return this.adapter;
  }

  async close(): Promise<void> {
    if (this.adapter.close) {
      await this.adapter.close();
    }
  }
}

export { QueueService, QueueAdapter, InMemoryQueueAdapter, BullMQAdapter, Job, JobOptions, WorkerHandler, QueueServiceConfig };
