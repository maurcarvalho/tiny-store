/**
 * Stock Sync Job — Async bulk stock updates via QueueService.
 *
 * Queue: inventory:stock-sync
 * Retry: 3 attempts, exponential backoff (1 s base).
 *
 * Bulk stock synchronization from warehouse management systems (WMS)
 * or ERP feeds is a classic async workload: large payloads, external
 * system dependencies, and tolerance for eventual consistency make it
 * a natural fit for queued processing rather than synchronous API calls.
 */

import { QueueService, Job } from '@tiny-store/shared-infrastructure';

const QUEUE_NAME = 'inventory:stock-sync';

interface StockSyncItem {
  sku: string;
  quantity: number;
}

interface StockSyncData {
  source: string; // e.g. 'warehouse-api', 'csv-import', 'erp-feed'
  items: StockSyncItem[];
  timestamp: string; // ISO 8601
}

/**
 * Registers the worker that processes bulk stock sync jobs.
 * Call once during application bootstrap.
 */
function registerStockSyncWorker(
  syncStock: (data: StockSyncData) => Promise<void>,
): void {
  const queue = QueueService.getInstance();

  queue.registerWorker<StockSyncData>(
    QUEUE_NAME,
    async (job: Job<StockSyncData>) => {
      console.log(
        `[StockSync] Syncing ${job.data.items.length} items from ${job.data.source}`,
      );
      await syncStock(job.data);
    },
  );
}

/**
 * Enqueue a bulk stock sync for async processing.
 */
async function enqueueStockSync(data: StockSyncData): Promise<void> {
  const queue = QueueService.getInstance();
  await queue.enqueue(QUEUE_NAME, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

export {
  registerStockSyncWorker,
  enqueueStockSync,
  StockSyncData,
  StockSyncItem,
  QUEUE_NAME,
};
