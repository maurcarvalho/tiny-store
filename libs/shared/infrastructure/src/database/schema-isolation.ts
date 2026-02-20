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

/** Cache of initialized DataSource instances per module */
const moduleConnections = new Map<string, DataSource>();

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
 * Get (or create and cache) a DataSource scoped to a specific module.
 *
 * For PostgreSQL, creates a new DataSource with the module's schema.
 * For SQLite, returns the base DataSource (single shared database).
 */
async function getModuleConnection(
  baseDataSource: DataSource,
  moduleName: ModuleName,
  entities: Function[]
): Promise<DataSource> {
  const cacheKey = `${moduleName}:${baseDataSource.options.database}`;

  const cached = moduleConnections.get(cacheKey);
  if (cached?.isInitialized) {
    return cached;
  }

  const baseOptions = baseDataSource.options;

  if (baseOptions.type !== 'postgres') {
    // SQLite — no schema support; return base DataSource as-is.
    moduleConnections.set(cacheKey, baseDataSource);
    return baseDataSource;
  }

  // PostgreSQL — create a schema-scoped DataSource
  const moduleDs = new DataSource({
    ...baseOptions,
    entities,
    schema: moduleName,
    extra: {
      ...(baseOptions as any).extra,
      options: `-c search_path="${moduleName}",public`,
    },
  } as DataSourceOptions);

  await moduleDs.initialize();
  moduleConnections.set(cacheKey, moduleDs);
  return moduleDs;
}

/**
 * Clear the connection cache. For testing only.
 */
function clearModuleConnections(): void {
  moduleConnections.clear();
}

export { MODULE_SCHEMAS, ModuleName, createAllModuleSchemas, getModuleConnection, clearModuleConnections, moduleConnections };
