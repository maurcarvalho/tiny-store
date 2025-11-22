import { DataSource } from 'typeorm';
import { ReserveStockService } from './service';
import { ReserveStockDto, ReserveStockResponse } from './dto';

export class ReserveStockHandler {
  private service: ReserveStockService;

  constructor(dataSource: DataSource) {
    this.service = new ReserveStockService(dataSource);
  }

  async handle(dto: ReserveStockDto): Promise<ReserveStockResponse> {
    return await this.service.execute(dto);
  }
}

