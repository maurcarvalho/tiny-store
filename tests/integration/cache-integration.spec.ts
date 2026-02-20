import { CacheService, RedisCacheAdapter } from '../../libs/shared/infrastructure/src/cache/cache.service';
import Redis from 'ioredis';

const REDIS = { host: 'localhost', port: 6379 };

describe('Cache Integration (Redis)', () => {
  let redis: Redis;
  let cacheService: CacheService;

  beforeAll(async () => {
    redis = new Redis(REDIS);
  });

  beforeEach(async () => {
    CacheService.resetInstance();
    await redis.flushall();
    cacheService = CacheService.getInstance({ adapter: 'redis', redis: REDIS });
  });

  afterEach(async () => {
    await cacheService.close();
  });

  afterAll(async () => {
    redis.disconnect();
  });

  it('should set and get values via Redis', async () => {
    await cacheService.set('orders', 'item:1', { id: 1, name: 'Widget' });
    const result = await cacheService.get<{ id: number; name: string }>('orders', 'item:1');
    expect(result).toEqual({ id: 1, name: 'Widget' });
  });

  it('should respect TTL expiration', async () => {
    await cacheService.set('orders', 'ephemeral', 'temp-data', 1);
    const before = await cacheService.get('orders', 'ephemeral');
    expect(before).toBe('temp-data');

    await new Promise(r => setTimeout(r, 1500));
    const after = await cacheService.get('orders', 'ephemeral');
    expect(after).toBeNull();
  });

  it('should namespace keys by module', async () => {
    await cacheService.set('orders', 'key', 'order-value');
    await cacheService.set('inventory', 'key', 'inventory-value');

    expect(await cacheService.get('orders', 'key')).toBe('order-value');
    expect(await cacheService.get('inventory', 'key')).toBe('inventory-value');

    // Verify actual Redis keys have namespace
    const keys = await redis.keys('tiny-store:*:key');
    expect(keys.length).toBe(2);
    expect(keys.sort()).toEqual([
      'tiny-store:inventory:key',
      'tiny-store:orders:key',
    ]);
  });

  it('should invalidate by pattern', async () => {
    await cacheService.set('orders', 'item:1', 'a');
    await cacheService.set('orders', 'item:2', 'b');
    await cacheService.set('orders', 'other', 'c');

    await cacheService.invalidatePattern('orders', 'item:*');

    expect(await cacheService.get('orders', 'item:1')).toBeNull();
    expect(await cacheService.get('orders', 'item:2')).toBeNull();
    expect(await cacheService.get('orders', 'other')).toBe('c');
  });

  it('should handle concurrent access', async () => {
    const modules = ['payments', 'inventory', 'orders', 'shipments'];
    const ops: Promise<void>[] = [];

    // Parallel writes
    for (const mod of modules) {
      for (let i = 0; i < 10; i++) {
        ops.push(cacheService.set(mod, `item:${i}`, { mod, i }));
      }
    }
    await Promise.all(ops);

    // Parallel reads
    const reads: Promise<any>[] = [];
    for (const mod of modules) {
      for (let i = 0; i < 10; i++) {
        reads.push(cacheService.get(mod, `item:${i}`));
      }
    }
    const results = await Promise.all(reads);

    // Verify all values correct
    let idx = 0;
    for (const mod of modules) {
      for (let i = 0; i < 10; i++) {
        expect(results[idx]).toEqual({ mod, i });
        idx++;
      }
    }
  });
});
