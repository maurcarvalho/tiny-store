import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { CancelOrderService } from './service';
import { CancelOrderDto, CancelOrderResponse } from './dto';

export class CancelOrderHandler {
  private service: CancelOrderService;

  constructor(db: DrizzleDb) {
    this.service = new CancelOrderService(db);
  }

  async handle(dto: CancelOrderDto): Promise<CancelOrderResponse> {
    return await this.service.execute(dto);
  }
}

