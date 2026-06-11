import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { UpdateProductStockService } from './service';
import { UpdateProductStockDto, UpdateProductStockResponse } from './dto';

export class UpdateProductStockHandler {
  private service: UpdateProductStockService;

  constructor(db: DrizzleDb) {
    this.service = new UpdateProductStockService(db);
  }

  async handle(dto: UpdateProductStockDto): Promise<UpdateProductStockResponse> {
    return await this.service.execute(dto);
  }
}
