import { DataSource } from 'typeorm';
import { GetProductService } from './service';
import { GetProductResponse } from './dto';

export class GetProductHandler {
  private service: GetProductService;

  constructor(dataSource: DataSource) {
    this.service = new GetProductService(dataSource);
  }

  async handle(sku: string): Promise<GetProductResponse> {
    return await this.service.execute(sku);
  }
}

