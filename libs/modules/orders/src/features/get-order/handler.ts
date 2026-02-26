import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { GetOrderService } from './service';
import { GetOrderResponse } from './dto';

export class GetOrderHandler {
  private service: GetOrderService;

  constructor(db: DrizzleDb) {
    this.service = new GetOrderService(db);
  }

  async handle(orderId: string): Promise<GetOrderResponse> {
    return await this.service.execute(orderId);
  }
}

