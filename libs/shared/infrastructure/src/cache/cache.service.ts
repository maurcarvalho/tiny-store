/**
 * CacheService — Module-namespaced caching with in-memory fallback.
 *
 * Supports both in-memory (default) and Redis-backed (ioredis) adapters.
 */

import Redis from 'ioredis';

interface CacheAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(keys: string[]): Promise<void>;
  keys(pattern: string): Promise<string[]>;
  close?(): Promise<void>;
}

interface CacheServiceConfig {
  adapter: 'memory' | 'redis';
  redis?: { host: string; port: number };
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

class RedisCacheAdapter implements CacheAdapter {
  private client: Redis;

  constructor(redis: { host: string; port: number }) {
    this.client = new Redis({ host: redis.host, port: redis.port, maxRetriesPerRequest: null });
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async close(): Promise<void> {
    this.client.disconnect();
  }

  getClient(): Redis {
    return this.client;
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

  static getInstance(configOrAdapter?: CacheAdapter | CacheServiceConfig): CacheService {
    if (!CacheService.instance) {
      let adapter: CacheAdapter | undefined;
      if (configOrAdapter && 'adapter' in configOrAdapter) {
        const config = configOrAdapter as CacheServiceConfig;
        if (config.adapter === 'redis') {
          adapter = new RedisCacheAdapter(config.redis ?? { host: 'localhost', port: 6379 });
        } else {
          adapter = new InMemoryCacheAdapter();
        }
      } else if (configOrAdapter) {
        adapter = configOrAdapter as CacheAdapter;
      }
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

  async close(): Promise<void> {
    if (this.adapter.close) {
      await this.adapter.close();
    }
  }
}

export { CacheService, CacheAdapter, InMemoryCacheAdapter, RedisCacheAdapter, CacheServiceConfig };
