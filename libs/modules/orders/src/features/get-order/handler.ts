import { DataSource } from 'typeorm';
import { GetOrderService } from './service';
import { GetOrderResponse } from './dto';

export class GetOrderHandler {
  private service: GetOrderService;

  constructor(dataSource: DataSource) {
    this.service = new GetOrderService(dataSource);
  }

  async handle(orderId: string): Promise<GetOrderResponse> {
    return await this.service.execute(orderId);
  }
}

