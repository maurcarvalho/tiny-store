/**
 * Shipment Label Generation Job — Async label creation via QueueService.
 *
 * Queue: shipments:label-gen
 * Retry: 3 attempts, exponential backoff (1 s base).
 */

import { QueueService, Job } from '@tiny-store/shared-infrastructure';

const QUEUE_NAME = 'shipments:label-gen';

interface LabelGenerationData {
  shipmentId: string;
  orderId: string;
  trackingNumber: string;
}

/**
 * Registers the worker that processes shipment label generation jobs.
 * Call once during application bootstrap.
 */
function registerLabelGenerationWorker(): void {
  const queue = QueueService.getInstance();

  queue.registerWorker<LabelGenerationData>(QUEUE_NAME, async (job: Job<LabelGenerationData>) => {
    // Simulates an external carrier API call for label generation.
    console.log(
      `[LabelGeneration] Generating shipping label for shipment ${job.data.shipmentId} ` +
      `(order ${job.data.orderId}, tracking ${job.data.trackingNumber})`
    );
  });
}

/**
 * Enqueue a shipment label generation for async processing.
 */
async function enqueueLabelGeneration(data: LabelGenerationData): Promise<void> {
  const queue = QueueService.getInstance();
  await queue.enqueue(QUEUE_NAME, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

export {
  registerLabelGenerationWorker,
  enqueueLabelGeneration,
  LabelGenerationData,
  QUEUE_NAME,
};
