import { Worker, NativeConnection } from '@temporalio/worker';
import type { DrizzleDb, EventBus } from '@tiny-store/shared-infrastructure';
import { createOrderActivities } from './activities';

export interface OrderWorkerOptions {
  temporalAddress: string;
  taskQueue?: string;
  namespace?: string;
  db: DrizzleDb;
  eventBus: EventBus;
}

export async function startOrderFulfillmentWorker(
  options: OrderWorkerOptions
): Promise<Worker> {
  const connection = await NativeConnection.connect({
    address: options.temporalAddress,
  });

  const worker = await Worker.create({
    connection,
    namespace: options.namespace ?? 'default',
    taskQueue: options.taskQueue ?? 'orders-fulfillment',
    workflowsPath: require.resolve('./order-fulfillment.workflow'),
    activities: createOrderActivities(options.db, options.eventBus),
  });

  void worker.run();
  return worker;
}
