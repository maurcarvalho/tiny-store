import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { DomainEvent } from '@tiny-store/shared-infrastructure';
import { ReleaseStockHandler } from '../features/release-stock/handler';

export class OrderPaymentFailedListener {
  private handler: ReleaseStockHandler;

  constructor(db: DrizzleDb) {
    this.handler = new ReleaseStockHandler(db);
  }

  async handle(event: DomainEvent): Promise<void> {
    const { orderId } = event.payload;

    await this.handler.handle({ orderId });
  }
}

