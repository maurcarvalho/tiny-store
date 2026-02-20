/**
 * CacheService — Module-namespaced caching with in-memory fallback.
 *
 * In production, swap the in-memory store for an ioredis-backed adapter.
 * For dev/test, the default in-memory implementation requires no Redis.
 */

interface CacheAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(keys: string[]): Promise<void>;
  keys(pattern: string): Promise<string[]>;
}

class InMemoryCacheAdapter implements CacheAdapter {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(keys: string[]): Promise<void> {
    for (const key of keys) {
      this.store.delete(key);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return Array.from(this.store.keys()).filter((k) => {
      // Also prune expired entries
      const entry = this.store.get(k)!;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.store.delete(k);
        return false;
      }
      return regex.test(k);
    });
  }

  /** Test helper — clear all entries */
  clear(): void {
    this.store.clear();
  }
}

class CacheService {
  private static instance: CacheService;
  private adapter: CacheAdapter;
  private globalPrefix: string;

  private constructor(adapter?: CacheAdapter, globalPrefix = 'tiny-store') {
    this.adapter = adapter ?? new InMemoryCacheAdapter();
    this.globalPrefix = globalPrefix;
  }

  static getInstance(adapter?: CacheAdapter): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService(adapter);
    }
    return CacheService.instance;
  }

  /** Reset singleton — for testing only */
  static resetInstance(): void {
    CacheService.instance = undefined as any;
  }

  private buildKey(module: string, key: string): string {
    return `${this.globalPrefix}:${module}:${key}`;
  }

  async get<T>(module: string, key: string): Promise<T | null> {
    const raw = await this.adapter.get(this.buildKey(module, key));
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  }

  async set<T>(module: string, key: string, value: T, ttlSeconds?: number): Promise<void> {
    const raw = JSON.stringify(value);
    await this.adapter.set(this.buildKey(module, key), raw, ttlSeconds);
  }

  async invalidatePattern(module: string, pattern: string): Promise<void> {
    const fullPattern = this.buildKey(module, pattern);
    const keys = await this.adapter.keys(fullPattern);
    if (keys.length > 0) {
      await this.adapter.del(keys);
    }
  }
}

export { CacheService, CacheAdapter, InMemoryCacheAdapter };
