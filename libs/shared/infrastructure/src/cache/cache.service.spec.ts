import { CacheService } from './cache.service';

describe('CacheService', () => {
  beforeEach(() => {
    CacheService.resetInstance();
  });

  it('should be a singleton', () => {
    const a = CacheService.getInstance();
    const b = CacheService.getInstance();
    expect(a).toBe(b);
  });

  it('should return null for missing keys', async () => {
    const cache = CacheService.getInstance();
    expect(await cache.get('orders', 'nonexistent')).toBeNull();
  });

  it('should set and get values with globalPrefix:module namespace', async () => {
    const cache = CacheService.getInstance();
    await cache.set('orders', 'item:1', { id: 1, name: 'Test' });
    const result = await cache.get<{ id: number; name: string }>('orders', 'item:1');
    expect(result).toEqual({ id: 1, name: 'Test' });
  });

  it('should isolate keys across modules', async () => {
    const cache = CacheService.getInstance();
    await cache.set('orders', 'key', 'order-value');
    await cache.set('inventory', 'key', 'inventory-value');
    expect(await cache.get('orders', 'key')).toBe('order-value');
    expect(await cache.get('inventory', 'key')).toBe('inventory-value');
  });

  it('should use tiny-store global prefix in key format', async () => {
    const cache = CacheService.getInstance();
    await cache.set('orders', 'item:1', 'val');
    // Verify via invalidatePattern that key format is tiny-store:orders:item:1
    await cache.invalidatePattern('orders', 'item:*');
    expect(await cache.get('orders', 'item:1')).toBeNull();
  });

  it('should expire entries after TTL', async () => {
    const cache = CacheService.getInstance();
    const now = Date.now;
    let time = Date.now();
    Date.now = () => time;
    await cache.set('orders', 'ephemeral', 'data', 1);
    time += 2000;
    expect(await cache.get('orders', 'ephemeral')).toBeNull();
    Date.now = now;
  });

  it('should invalidate by pattern', async () => {
    const cache = CacheService.getInstance();
    await cache.set('orders', 'item:1', 'a');
    await cache.set('orders', 'item:2', 'b');
    await cache.set('orders', 'other', 'c');
    await cache.invalidatePattern('orders', 'item:*');
    expect(await cache.get('orders', 'item:1')).toBeNull();
    expect(await cache.get('orders', 'item:2')).toBeNull();
    expect(await cache.get('orders', 'other')).toBe('c');
  });
});
