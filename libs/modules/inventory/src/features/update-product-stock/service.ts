import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { UpdateProductStockDto, UpdateProductStockResponse } from './dto';

export class UpdateProductStockService {
  private productRepository: ProductRepository;

  constructor(db: DrizzleDb) {
    this.productRepository = new ProductRepository(db);
  }

  async execute(dto: UpdateProductStockDto): Promise<UpdateProductStockResponse> {
    const product = await this.productRepository.findBySku(dto.sku);

    if (!product) {
      throw new Error(`Product not found: ${dto.sku}`);
    }

    product.adjustStock(dto.stockQuantity);
    await this.productRepository.save(product);

    return {
      productId: product.id,
      sku: product.sku.value,
      name: product.name,
      stockQuantity: product.stockQuantity,
      availableStock: product.availableStock,
      reservedQuantity: product.reservedQuantity,
      status: product.status,
    };
  }
}
