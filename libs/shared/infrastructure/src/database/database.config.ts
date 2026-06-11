import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export type DrizzleDb = PostgresJsDatabase;

let sqlConnection: ReturnType<typeof postgres> | null = null;

const MODULE_SCHEMAS = ['inventory', 'orders', 'payments', 'shipments'] as const;

export const createDatabaseConnection = async (): Promise<DrizzleDb> => {
  const sql = postgres({
    host: process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['DB_PORT'] || '5432'),
    username: process.env['DB_USER'] || 'tinystore',
    password: process.env['DB_PASSWORD'] || 'tinystore',
    database: process.env['DB_NAME'] || 'tinystore',
  });

  sqlConnection = sql;

  for (const schema of MODULE_SCHEMAS) {
    await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  }

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS inventory.products (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      name TEXT NOT NULL,
      stock_quantity INTEGER NOT NULL,
      reserved_quantity INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );
    CREATE TABLE IF NOT EXISTS inventory.stock_reservations (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      sku TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      created_at TIMESTAMP NOT NULL,
      expires_at TIMESTAMP,
      released BOOLEAN NOT NULL DEFAULT false
    );
    CREATE TABLE IF NOT EXISTS orders.orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      items JSONB NOT NULL,
      total_amount NUMERIC(10,2) NOT NULL,
      shipping_address JSONB NOT NULL,
      status TEXT NOT NULL,
      payment_id TEXT,
      shipment_id TEXT,
      cancellation_reason TEXT,
      rejection_reason TEXT,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );
    CREATE TABLE IF NOT EXISTS payments.payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      status TEXT NOT NULL,
      payment_method JSONB NOT NULL,
      failure_reason TEXT,
      processing_attempts INTEGER NOT NULL,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );
    CREATE TABLE IF NOT EXISTS shipments.shipments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      tracking_number TEXT NOT NULL,
      shipping_address JSONB NOT NULL,
      status TEXT NOT NULL,
      dispatched_at TIMESTAMP,
      delivered_at TIMESTAMP,
      estimated_delivery_date TIMESTAMP,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );
    CREATE TABLE IF NOT EXISTS event_store (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      aggregate_id TEXT NOT NULL,
      aggregate_type TEXT NOT NULL,
      occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
      payload JSONB NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    );
  `);

  return drizzle(sql);
};

export const closeDatabaseConnection = async (): Promise<void> => {
  if (sqlConnection) {
    await sqlConnection.end();
    sqlConnection = null;
  }
};
