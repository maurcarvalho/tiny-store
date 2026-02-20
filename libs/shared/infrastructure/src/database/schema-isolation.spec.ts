import { MODULE_SCHEMAS, getModuleConnection, createAllModuleSchemas, clearModuleConnections } from './schema-isolation';
import { DataSource } from 'typeorm';

describe('Schema Isolation', () => {
  beforeEach(() => {
    clearModuleConnections();
  });

  it('should export MODULE_SCHEMAS with expected modules', () => {
    expect(MODULE_SCHEMAS).toContain('orders');
    expect(MODULE_SCHEMAS).toContain('inventory');
    expect(MODULE_SCHEMAS).toContain('payments');
    expect(MODULE_SCHEMAS).toContain('shipments');
  });

  it('should return the base DataSource for SQLite (no schema)', async () => {
    const ds = new DataSource({ type: 'sqlite', database: ':memory:' });
    await ds.initialize();
    const result = await getModuleConnection(ds, 'orders', []);
    expect(result).toBe(ds);
    await ds.destroy();
  });

  it('should cache and return the same DataSource for repeated calls', async () => {
    const ds = new DataSource({ type: 'sqlite', database: ':memory:' });
    await ds.initialize();
    const first = await getModuleConnection(ds, 'orders', []);
    const second = await getModuleConnection(ds, 'orders', []);
    expect(first).toBe(second);
    await ds.destroy();
  });

  it('should no-op createAllModuleSchemas for SQLite', async () => {
    const ds = new DataSource({ type: 'sqlite', database: ':memory:' });
    await ds.initialize();
    // Should not throw
    await createAllModuleSchemas(ds);
    await ds.destroy();
  });
});
