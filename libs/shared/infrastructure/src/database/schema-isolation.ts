/**
 * Schema Isolation — Per-module PostgreSQL schema isolation.
 *
 * Each module gets its own PostgreSQL schema (e.g. "orders", "inventory").
 * This ensures clean separation between bounded contexts at the database level.
 */

import { DataSource, DataSourceOptions } from 'typeorm';

const MODULE_SCHEMAS = ['orders', 'inventory', 'payments', 'shipments'] as const;
type ModuleName = (typeof MODULE_SCHEMAS)[number];

/** Cache of initialized DataSource instances per module */
const moduleConnections = new Map<string, DataSource>();

/**
 * Create PostgreSQL schemas for all modules.
 * Guards against non-postgres drivers for safety.
 */
async function createAllModuleSchemas(dataSource: DataSource): Promise<void> {
  const driver = dataSource.options.type;
  if (driver !== 'postgres') {
    return;
  }

  for (const schema of MODULE_SCHEMAS) {
    await dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  }
}

/**
 * Get (or create and cache) a DataSource scoped to a specific module's schema.
 *
 * Creates a new DataSource with the module's PostgreSQL schema.
 * Non-postgres drivers are returned as-is (safety fallback).
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
    // Safety fallback for non-postgres drivers
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
