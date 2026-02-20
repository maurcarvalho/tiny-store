/**
 * @Cacheable — Read-through caching decorator.
 *
 * Caches the return value of a method using CacheService.
 * On cache hit the method body is skipped.
 */

import { CacheService } from './cache.service';

type KeyFn = (...args: any[]) => string;

function Cacheable(module: string, ttlSeconds: number, keyFn: KeyFn) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cache = CacheService.getInstance();
      const cacheKey = keyFn(...args);

      const cached = await cache.get<any>(module, cacheKey);
      if (cached !== null) {
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      await cache.set(module, cacheKey, result, ttlSeconds);
      return result;
    };

    return descriptor;
  };
}

export { Cacheable };
