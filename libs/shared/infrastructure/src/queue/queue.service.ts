/**
 * QueueService — Module-scoped job queues with in-memory fallback.
 *
 * Queue names follow the convention `module:purpose`.
 * In production, swap for a BullMQ-backed adapter.
 * The default in-memory implementation requires no Redis.
 */

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

    // Process immediately if a worker is registered (simulate async)
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

class QueueService {
  private static instance: QueueService;
  private adapter: QueueAdapter;

  private constructor(adapter?: QueueAdapter) {
    this.adapter = adapter ?? new InMemoryQueueAdapter();
  }

  static getInstance(adapter?: QueueAdapter): QueueService {
    if (!QueueService.instance) {
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
}

export { QueueService, QueueAdapter, InMemoryQueueAdapter, Job, JobOptions, WorkerHandler };
