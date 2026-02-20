/**
 * Exercise 3: Direct Infrastructure Dependency (α degradation)
 *
 * This would be added to the inventory module, e.g.:
 *   libs/modules/inventory/src/features/get-product/service.ts
 *
 * VIOLATION: The inventory module directly imports 'ioredis' to add product
 * caching, bypassing the shared infrastructure abstraction layer. The Redis
 * connection details are hard-coded in the module rather than injected through
 * an infrastructure port.
 *
 * WHY G1 PASSES: 'ioredis' is a third-party npm package, not another module.
 * G1 boundary tests only check for cross-module imports (@tiny-store/modules-*),
 * not for direct infrastructure library usage.
 *
 * WHY G2 PASSES: The new dependency does not affect maintainability metrics.
 * No module contract is violated, no complexity threshold is crossed.
 *
 * WHAT G3 CATCHES: α drops below 1.0 because a module now has a direct
 * infrastructure dependency. If this module were extracted to a separate
 * service (L3), the Redis connection configuration would be hard-coded
 * rather than provided through the shared infrastructure layer. The module
 * cannot be deployed independently without carrying its own Redis setup.
 *
 * Metric impact: α ↓ (from 1.0 to 0.75, since 1 of 4 modules has unclean infra)
 *
 * FIX: Create a CacheService in @tiny-store/shared-infrastructure (or use
 * the existing one) that wraps Redis access. The inventory module should
 * import from @tiny-store/shared-infrastructure, not from 'ioredis' directly.
 */

// ❌ VIOLATION: direct import of infrastructure library
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { GetProductResponse } from './dto';

// ❌ Hard-coded Redis configuration — not injectable, not abstracted
const redis = new Redis({
  host: process.env['REDIS_HOST'] || 'localhost',
  port: parseInt(process.env['REDIS_PORT'] || '6379'),
});

const CACHE_TTL = 300; // 5 minutes

export class GetProductService {
  private productRepository: ProductRepository;

  constructor(dataSource: DataSource) {
    this.productRepository = new ProductRepository(dataSource);
  }

  async execute(productId: string): Promise<GetProductResponse> {
    // ❌ Direct Redis usage inside module code
    const cacheKey = `product:${productId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached) as GetProductResponse;
    }

    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const response: GetProductResponse = {
      id: product.id,
      sku: product.sku,
      name: product.name,
      stockQuantity: product.stockQuantity,
      reservedQuantity: product.reservedQuantity,
      status: product.status,
    };

    // ❌ Direct Redis usage
    await redis.set(cacheKey, JSON.stringify(response), 'EX', CACHE_TTL);

    return response;
  }
}
