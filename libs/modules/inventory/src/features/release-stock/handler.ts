import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { ReleaseStockService } from './service';
import { ReleaseStockDto, ReleaseStockResponse } from './dto';

export class ReleaseStockHandler {
  private service: ReleaseStockService;

  constructor(db: DrizzleDb) {
    this.service = new ReleaseStockService(db);
  }

  async handle(dto: ReleaseStockDto): Promise<ReleaseStockResponse> {
    return await this.service.execute(dto);
  }
}

