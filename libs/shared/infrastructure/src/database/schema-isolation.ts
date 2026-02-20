/**
 * Schema Isolation — Per-module PostgreSQL schema isolation.
 *
 * In production (PostgreSQL), each module gets its own schema (e.g. "orders", "inventory").
 * In dev/test (SQLite), schemas are not supported — the API degrades gracefully
 * and all entities share the same database (the current behaviour).
 */

import { DataSource, DataSourceOptions } from 'typeorm';

const MODULE_SCHEMAS = ['orders', 'inventory', 'payments', 'shipments'] as const;
type ModuleName = (typeof MODULE_SCHEMAS)[number];

/**
 * Create PostgreSQL schemas for all modules. No-op for SQLite.
 */
async function createAllModuleSchemas(dataSource: DataSource): Promise<void> {
  const driver = dataSource.options.type;
  if (driver !== 'postgres') {
    // SQLite (and other non-PG drivers) don't support schemas — skip gracefully.
    return;
  }

  for (const schema of MODULE_SCHEMAS) {
    await dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  }
}

/**
 * Build DataSourceOptions scoped to a specific module schema.
 *
 * For PostgreSQL, sets `schema` so all entities in this connection
 * live under the module's schema.
 * For SQLite, returns options unchanged (single shared database).
 */
function getModuleConnection(
  baseOptions: DataSourceOptions,
  moduleName: ModuleName,
  entities: Function[]
): DataSourceOptions {
  const opts: DataSourceOptions = {
    ...baseOptions,
    entities,
  } as DataSourceOptions;

  if (baseOptions.type === 'postgres') {
    return { ...opts, schema: moduleName } as DataSourceOptions;
  }

  // SQLite — no schema support; return as-is.
  return opts;
}

export { MODULE_SCHEMAS, ModuleName, createAllModuleSchemas, getModuleConnection };
