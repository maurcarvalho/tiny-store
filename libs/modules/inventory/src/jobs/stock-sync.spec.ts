import { QueueService } from '@tiny-store/shared-infrastructure';
import {
  registerStockSyncWorker,
  enqueueStockSync,
  QUEUE_NAME,
  StockSyncData,
} from './stock-sync.job';

describe('Stock Sync Job', () => {
  beforeEach(() => {
    QueueService.resetInstance();
  });

  it('should enqueue stock sync data with correct queue name', async () => {
    const queue = QueueService.getInstance();
    const job = await queue.enqueue(QUEUE_NAME, {
      source: 'warehouse-api',
      items: [{ sku: 'SKU-001', quantity: 50 }],
      timestamp: '2026-02-20T10:00:00Z',
    });
    expect(job.queue).toBe('inventory:stock-sync');
    expect(job.data.items).toHaveLength(1);
  });

  it('should process bulk stock sync via registered worker', async () => {
    const synced: StockSyncData[] = [];

    registerStockSyncWorker(async (data) => {
      synced.push(data);
    });

    await enqueueStockSync({
      source: 'csv-import',
      items: [
        { sku: 'SKU-001', quantity: 100 },
        { sku: 'SKU-002', quantity: 200 },
      ],
      timestamp: '2026-02-20T10:00:00Z',
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(synced).toHaveLength(1);
    expect(synced[0].items).toHaveLength(2);
    expect(synced[0].source).toBe('csv-import');
  });

  it('should use exponential backoff with 3 attempts', async () => {
    const queue = QueueService.getInstance();
    const job = await queue.enqueue(QUEUE_NAME, {
      source: 'test',
      items: [],
      timestamp: new Date().toISOString(),
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
    expect(job.options.attempts).toBe(3);
    expect(job.options.backoff).toEqual({ type: 'exponential', delay: 1000 });
  });
});
