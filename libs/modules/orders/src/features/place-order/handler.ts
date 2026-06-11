import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { PlaceOrderService } from './service';
import { PlaceOrderDto, PlaceOrderResponse } from './dto';

export class PlaceOrderHandler {
  private service: PlaceOrderService;

  constructor(db: DrizzleDb) {
    this.service = new PlaceOrderService(db);
  }

  async handle(dto: PlaceOrderDto): Promise<PlaceOrderResponse> {
    return await this.service.execute(dto);
  }
}

