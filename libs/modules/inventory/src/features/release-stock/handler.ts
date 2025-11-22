import { DataSource } from 'typeorm';
import { ReleaseStockService } from './service';
import { ReleaseStockDto, ReleaseStockResponse } from './dto';

export class ReleaseStockHandler {
  private service: ReleaseStockService;

  constructor(dataSource: DataSource) {
    this.service = new ReleaseStockService(dataSource);
  }

  async handle(dto: ReleaseStockDto): Promise<ReleaseStockResponse> {
    return await this.service.execute(dto);
  }
}

