import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { ReserveStockService } from './service';
import { ReserveStockDto, ReserveStockResponse } from './dto';

export class ReserveStockHandler {
  private service: ReserveStockService;

  constructor(db: DrizzleDb) {
    this.service = new ReserveStockService(db);
  }

  async handle(dto: ReserveStockDto): Promise<ReserveStockResponse> {
    return await this.service.execute(dto);
  }
}

