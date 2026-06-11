import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { GetProductService } from './service';
import { GetProductResponse } from './dto';

export class GetProductHandler {
  private service: GetProductService;

  constructor(db: DrizzleDb) {
    this.service = new GetProductService(db);
  }

  async handle(sku: string): Promise<GetProductResponse> {
    return await this.service.execute(sku);
  }
}

