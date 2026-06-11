/**
 * Exercise G3-3: Direct Infrastructure Import
 *
 * This is a modified version that imports `ioredis` directly instead of
 * using the shared CacheService abstraction.
 *
 * WHY THIS VIOLATES G3:
 * - G1 (Guidelines) passes: caching works correctly
 * - G2 (Boundaries) passes: ioredis is a third-party package, not a module import
 * - G3 (Scalability) FAILS: abstraction coverage drops — the module is tightly
 *   coupled to Redis as a specific technology. When extracting this module,
 *   you cannot swap the cache backend (e.g., to an in-memory adapter for
 *   testing, or to a different cache provider). The CacheService abstraction
 *   exists precisely to decouple modules from infrastructure choices.
 *
 * FIX: Use `CacheService.getInstance()` from `@tiny-store/shared-infrastructure`
 * which provides module-namespaced caching with pluggable adapters.
 */

import Redis from 'ioredis';

interface CachedShipment {
  shipmentId: string;
  orderId: string;
  trackingNumber: string;
  status: string;
}

/**
 * This service uses ioredis directly instead of the CacheService abstraction
 * — a G3 violation that reduces abstraction coverage.
 */
export class ShipmentCacheServiceDirect {
  // VIOLATION: direct Redis instantiation bypassing CacheService
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
    });
  }

  async getCachedShipment(shipmentId: string): Promise<CachedShipment | null> {
    // VIOLATION: direct Redis call with ad-hoc key naming
    const raw = await this.redis.get(`shipment:${shipmentId}`);
    if (!raw) return null;
    return JSON.parse(raw) as CachedShipment;
  }

  async cacheShipment(shipment: CachedShipment, ttlSeconds = 300): Promise<void> {
    // VIOLATION: no module namespace prefix, no adapter abstraction
    await this.redis.set(
      `shipment:${shipment.shipmentId}`,
      JSON.stringify(shipment),
      'EX',
      ttlSeconds
    );
  }

  async invalidate(shipmentId: string): Promise<void> {
    await this.redis.del(`shipment:${shipmentId}`);
  }
}
