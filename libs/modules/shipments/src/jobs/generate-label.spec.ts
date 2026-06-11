import { QueueService } from '@tiny-store/shared-infrastructure';
import { registerLabelGenerationWorker, enqueueLabelGeneration, QUEUE_NAME } from './generate-label.job';

describe('Generate Label Job', () => {
  beforeEach(() => {
    QueueService.resetInstance();
  });

  it('should enqueue a label generation job', async () => {
    const queue = QueueService.getInstance();
    const data = { shipmentId: 's1', orderId: 'o1', trackingNumber: 'TN123' };

    const job = await queue.enqueue(QUEUE_NAME, data);
    expect(job.queue).toBe('shipments:label-gen');
    expect(job.data).toEqual(data);
  });

  it('should register worker and process job', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    registerLabelGenerationWorker();
    await enqueueLabelGeneration({ shipmentId: 's1', orderId: 'o1', trackingNumber: 'TN123' });

    // Allow setImmediate to fire
    await new Promise((r) => setTimeout(r, 50));

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[LabelGeneration] Generating shipping label for shipment s1')
    );
    consoleSpy.mockRestore();
  });
});
