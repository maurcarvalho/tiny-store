import { DataSource } from 'typeorm';
import { DomainEvent } from '@tiny-store/shared-infrastructure';
import { ReserveStockHandler } from '../features/reserve-stock/handler';

export class OrderPlacedListener {
  private handler: ReserveStockHandler;

  constructor(dataSource: DataSource) {
    this.handler = new ReserveStockHandler(dataSource);
  }

  async handle(event: DomainEvent): Promise<void> {
    const { orderId, items } = event.payload;

    await this.handler.handle({
      orderId,
      items,
    });
  }
}

