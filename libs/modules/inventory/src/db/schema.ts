import { pgSchema, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core';

const inventorySchema = pgSchema('inventory');

export const productsTable = inventorySchema.table('products', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  stockQuantity: integer('stock_quantity').notNull(),
  reservedQuantity: integer('reserved_quantity').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const stockReservationsTable = inventorySchema.table('stock_reservations', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull(),
  sku: text('sku').notNull(),
  quantity: integer('quantity').notNull(),
  createdAt: timestamp('created_at').notNull(),
  expiresAt: timestamp('expires_at'),
  released: boolean('released').notNull().default(false),
});
