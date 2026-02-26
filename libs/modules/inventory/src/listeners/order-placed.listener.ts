import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { DomainEvent } from '@tiny-store/shared-infrastructure';
import { ReserveStockHandler } from '../features/reserve-stock/handler';

export class OrderPlacedListener {
  private handler: ReserveStockHandler;

  constructor(db: DrizzleDb) {
    this.handler = new ReserveStockHandler(db);
  }

  async handle(event: DomainEvent): Promise<void> {
    const { orderId, items } = event.payload;

    await this.handler.handle({
      orderId,
      items,
    });
  }
}

