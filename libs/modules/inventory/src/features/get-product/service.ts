import { DataSource } from 'typeorm';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { GetProductResponse } from './dto';
import { NotFoundError } from '@tiny-store/shared-domain';
import { Cacheable } from '@tiny-store/shared-infrastructure';

export class GetProductService {
  private productRepository: ProductRepository;

  constructor(dataSource: DataSource) {
    this.productRepository = new ProductRepository(dataSource);
  }

  @Cacheable('inventory', 60, (sku: string) => `product:${sku}`)
  async execute(sku: string): Promise<GetProductResponse> {
    const product = await this.productRepository.findBySku(sku);

    if (!product) {
      throw new NotFoundError(`Product with SKU ${sku} not found`);
    }

    return {
      productId: product.id,
      sku: product.sku.value,
      name: product.name,
      stockQuantity: product.stockQuantity,
      reservedQuantity: product.reservedQuantity,
      availableStock: product.availableStock,
      status: product.status,
    };
  }
}

