import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { CreateProductService } from './service';
import { CreateProductDto, CreateProductResponse } from './dto';

export class CreateProductHandler {
  private service: CreateProductService;

  constructor(db: DrizzleDb) {
    this.service = new CreateProductService(db);
  }

  async handle(dto: CreateProductDto): Promise<CreateProductResponse> {
    return await this.service.execute(dto);
  }
}

