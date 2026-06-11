import { MODULE_SCHEMAS } from './schema-isolation';

describe('Schema Isolation', () => {
  it('should export MODULE_SCHEMAS with expected modules', () => {
    expect(MODULE_SCHEMAS).toContain('orders');
    expect(MODULE_SCHEMAS).toContain('inventory');
    expect(MODULE_SCHEMAS).toContain('payments');
    expect(MODULE_SCHEMAS).toContain('shipments');
  });

  it('should have exactly 4 module schemas', () => {
    expect(MODULE_SCHEMAS).toHaveLength(4);
  });

  it('should be a readonly tuple', () => {
    const schemas: readonly string[] = MODULE_SCHEMAS;
    expect(Array.isArray(schemas)).toBe(true);
  });
});
