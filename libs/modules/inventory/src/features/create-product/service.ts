import { DataSource } from 'typeorm';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { Product } from '../../domain/entities/product';
import { Sku } from '../../domain/value-objects/sku.value-object';
import { CreateProductDto, CreateProductResponse } from './dto';
import { BusinessRuleViolationError } from '@tiny-store/shared-domain';

export class CreateProductService {
  private productRepository: ProductRepository;

  constructor(dataSource: DataSource) {
    this.productRepository = new ProductRepository(dataSource);
  }

  async execute(dto: CreateProductDto): Promise<CreateProductResponse> {
    const sku = Sku.create(dto.sku);

    // Check if product already exists
    const existing = await this.productRepository.findBySku(sku.value);
    if (existing) {
      throw new BusinessRuleViolationError(
        `Product with SKU ${sku.value} already exists`
      );
    }

    const product = Product.create(sku, dto.name, dto.stockQuantity);

    await this.productRepository.save(product);

    return {
      productId: product.id,
      sku: product.sku.value,
      name: product.name,
      stockQuantity: product.stockQuantity,
      availableStock: product.availableStock,
    };
  }
}

