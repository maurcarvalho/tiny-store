import { DataSource } from 'typeorm';
import { PlaceOrderService } from './service';
import { PlaceOrderDto, PlaceOrderResponse } from './dto';

export class PlaceOrderHandler {
  private service: PlaceOrderService;

  constructor(dataSource: DataSource) {
    this.service = new PlaceOrderService(dataSource);
  }

  async handle(dto: PlaceOrderDto): Promise<PlaceOrderResponse> {
    return await this.service.execute(dto);
  }
}

