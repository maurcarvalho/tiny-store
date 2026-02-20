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

  describe('PostgreSQL', () => {
    let ds: DataSource;

    beforeAll(async () => {
      ds = new DataSource({
        type: 'postgres',
        host: process.env['DB_HOST'] || 'localhost',
        port: parseInt(process.env['DB_PORT'] || '5432'),
        username: process.env['DB_USER'] || 'tinystore',
        password: process.env['DB_PASSWORD'] || 'tinystore',
        database: process.env['DB_NAME'] || 'tinystore',
      });
      await ds.initialize();
    });

    afterAll(async () => {
      if (ds?.isInitialized) await ds.destroy();
    });

    it('should create all module schemas', async () => {
      await createAllModuleSchemas(ds);
      const result = await ds.query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name = ANY($1)`,
        [['orders', 'inventory', 'payments', 'shipments']]
      );
      expect(result.length).toBe(4);
    });

    it('should cache and return the same DataSource for repeated calls', async () => {
      const first = await getModuleConnection(ds, 'orders', []);
      const second = await getModuleConnection(ds, 'orders', []);
      expect(first).toBe(second);
      if (first !== ds && first.isInitialized) await first.destroy();
    });
  });
});
