import { CacheService } from './cache.service';
import { Cacheable } from './cache.decorator';

describe('@Cacheable', () => {
  beforeEach(() => {
    CacheService.resetInstance();
  });

  it('should cache the return value on first call', async () => {
    let callCount = 0;

    class Service {
      @Cacheable('orders', 60, (id: string) => `order:${id}`)
      async getOrder(id: string) {
        callCount++;
        return { id, total: 100 };
      }
    }

    const svc = new Service();
    const first = await svc.getOrder('1');
    const second = await svc.getOrder('1');

    expect(first).toEqual({ id: '1', total: 100 });
    expect(second).toEqual({ id: '1', total: 100 });
    expect(callCount).toBe(1); // method only called once
  });

  it('should cache separately for different arguments', async () => {
    let callCount = 0;

    class Service {
      @Cacheable('orders', 60, (id: string) => `order:${id}`)
      async getOrder(id: string) {
        callCount++;
        return { id };
      }
    }

    const svc = new Service();
    await svc.getOrder('1');
    await svc.getOrder('2');
    expect(callCount).toBe(2);
  });
});
