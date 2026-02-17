import { DataSource } from 'typeorm';
import { UpdateProductStockService } from './service';
import { UpdateProductStockDto, UpdateProductStockResponse } from './dto';

export class UpdateProductStockHandler {
  private service: UpdateProductStockService;

  constructor(dataSource: DataSource) {
    this.service = new UpdateProductStockService(dataSource);
  }

  async handle(dto: UpdateProductStockDto): Promise<UpdateProductStockResponse> {
    return await this.service.execute(dto);
  }
}
