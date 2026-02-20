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

  it('should set and get values with module namespace', async () => {
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

  it('should expire entries after TTL', async () => {
    const cache = CacheService.getInstance();
    // Use a very short TTL; the in-memory adapter stores expiresAt = now + ttl*1000
    // With ttl=0, expiresAt = now, so next get (even 1ms later) should miss.
    const now = Date.now;
    let time = Date.now();
    Date.now = () => time;
    await cache.set('orders', 'ephemeral', 'data', 1);
    // Advance fake clock past TTL
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
