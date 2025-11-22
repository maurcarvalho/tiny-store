import { DataSource } from 'typeorm';
import { CreateProductService } from './service';
import { CreateProductDto, CreateProductResponse } from './dto';

export class CreateProductHandler {
  private service: CreateProductService;

  constructor(dataSource: DataSource) {
    this.service = new CreateProductService(dataSource);
  }

  async handle(dto: CreateProductDto): Promise<CreateProductResponse> {
    return await this.service.execute(dto);
  }
}

