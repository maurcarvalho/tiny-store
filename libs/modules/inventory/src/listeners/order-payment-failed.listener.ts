import { DataSource } from 'typeorm';
import { DomainEvent } from '@tiny-store/shared-infrastructure';
import { ReleaseStockHandler } from '../features/release-stock/handler';

export class OrderPaymentFailedListener {
  private handler: ReleaseStockHandler;

  constructor(dataSource: DataSource) {
    this.handler = new ReleaseStockHandler(dataSource);
  }

  async handle(event: DomainEvent): Promise<void> {
    const { orderId } = event.payload;

    await this.handler.handle({ orderId });
  }
}

