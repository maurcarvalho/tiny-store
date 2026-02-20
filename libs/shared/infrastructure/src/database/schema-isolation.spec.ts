import { MODULE_SCHEMAS, ModuleName, getModuleConnection, createAllModuleSchemas } from './schema-isolation';
import { DataSource, DataSourceOptions } from 'typeorm';

describe('Schema Isolation', () => {
  it('should export MODULE_SCHEMAS with expected modules', () => {
    expect(MODULE_SCHEMAS).toContain('orders');
    expect(MODULE_SCHEMAS).toContain('inventory');
    expect(MODULE_SCHEMAS).toContain('payments');
    expect(MODULE_SCHEMAS).toContain('shipments');
  });

  it('should return SQLite options unchanged (no schema)', () => {
    const base: DataSourceOptions = {
      type: 'sqlite',
      database: ':memory:',
    };
    const result = getModuleConnection(base, 'orders', []);
    expect(result.type).toBe('sqlite');
    expect((result as any).schema).toBeUndefined();
  });

  it('should set schema for PostgreSQL options', () => {
    const base: DataSourceOptions = {
      type: 'postgres',
      host: 'localhost',
      database: 'test',
    } as DataSourceOptions;
    const result = getModuleConnection(base, 'orders', []);
    expect((result as any).schema).toBe('orders');
  });

  it('should no-op createAllModuleSchemas for SQLite', async () => {
    const ds = new DataSource({ type: 'sqlite', database: ':memory:' });
    await ds.initialize();
    // Should not throw
    await createAllModuleSchemas(ds);
    await ds.destroy();
  });
});
