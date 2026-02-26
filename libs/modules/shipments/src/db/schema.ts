import { pgSchema, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

const shipmentsSchema = pgSchema('shipments');

export const shipmentsTable = shipmentsSchema.table('shipments', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull(),
  trackingNumber: text('tracking_number').notNull(),
  shippingAddress: jsonb('shipping_address').$type<{
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }>().notNull(),
  status: text('status').notNull(),
  dispatchedAt: timestamp('dispatched_at'),
  deliveredAt: timestamp('delivered_at'),
  estimatedDeliveryDate: timestamp('estimated_delivery_date'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});
