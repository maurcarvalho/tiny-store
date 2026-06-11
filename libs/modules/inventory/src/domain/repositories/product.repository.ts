import { eq } from 'drizzle-orm';
import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { productsTable } from '../../db/schema';
import { Product } from '../entities/product';
import { Sku } from '../value-objects/sku.value-object';
import { ProductStatus } from '../enums/product-status.enum';

export class ProductRepository {
  constructor(private db: DrizzleDb) {}

  async save(product: Product): Promise<void> {
    await this.db.insert(productsTable).values({
      id: product.id,
      sku: product.sku.value,
      name: product.name,
      stockQuantity: product.stockQuantity,
      reservedQuantity: product.reservedQuantity,
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }).onConflictDoUpdate({
      target: productsTable.id,
      set: {
        sku: product.sku.value,
        name: product.name,
        stockQuantity: product.stockQuantity,
        reservedQuantity: product.reservedQuantity,
        status: product.status,
        updatedAt: product.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<Product | null> {
    const rows = await this.db.select().from(productsTable).where(eq(productsTable.id, id));
    return rows.length > 0 ? this.toDomain(rows[0]) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const rows = await this.db.select().from(productsTable).where(eq(productsTable.sku, sku));
    return rows.length > 0 ? this.toDomain(rows[0]) : null;
  }

  async findAll(): Promise<Product[]> {
    const rows = await this.db.select().from(productsTable);
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: typeof productsTable.$inferSelect): Product {
    return Product.reconstitute(
      row.id,
      Sku.create(row.sku),
      row.name,
      row.stockQuantity,
      row.reservedQuantity,
      row.status as ProductStatus,
      row.createdAt,
      row.updatedAt
    );
  }
}
