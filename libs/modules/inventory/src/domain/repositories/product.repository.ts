import { DataSource, Repository } from 'typeorm';
import { Product } from '../entities/product';
import { ProductEntity } from '../entities/product.entity';
import { Sku } from '../value-objects/sku.value-object';
import { ProductStatus } from '../enums/product-status.enum';

export class ProductRepository {
  private repository: Repository<ProductEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(ProductEntity);
  }

  async save(product: Product): Promise<void> {
    const entity = this.repository.create({
      id: product.id,
      sku: product.sku.value,
      name: product.name,
      stockQuantity: product.stockQuantity,
      reservedQuantity: product.reservedQuantity,
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    });

    await this.repository.save(entity);
  }

  async findById(id: string): Promise<Product | null> {
    const entity = await this.repository.findOne({ where: { id } });
    
    if (!entity) {
      return null;
    }

    return this.toDomain(entity);
  }

  async findBySku(sku: string): Promise<Product | null> {
    const entity = await this.repository.findOne({ where: { sku } });
    
    if (!entity) {
      return null;
    }

    return this.toDomain(entity);
  }

  async findAll(): Promise<Product[]> {
    const entities = await this.repository.find();
    return entities.map((entity) => this.toDomain(entity));
  }

  private toDomain(entity: ProductEntity): Product {
    return Product.reconstitute(
      entity.id,
      Sku.create(entity.sku),
      entity.name,
      entity.stockQuantity,
      entity.reservedQuantity,
      entity.status as ProductStatus,
      entity.createdAt,
      entity.updatedAt
    );
  }
}

