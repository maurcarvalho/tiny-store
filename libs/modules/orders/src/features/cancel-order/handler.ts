import { DataSource } from 'typeorm';
import { CancelOrderService } from './service';
import { CancelOrderDto, CancelOrderResponse } from './dto';

export class CancelOrderHandler {
  private service: CancelOrderService;

  constructor(dataSource: DataSource) {
    this.service = new CancelOrderService(dataSource);
  }

  async handle(dto: CancelOrderDto): Promise<CancelOrderResponse> {
    return await this.service.execute(dto);
  }
}

