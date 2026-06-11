import { pgSchema, text, numeric, timestamp, jsonb } from 'drizzle-orm/pg-core';

const ordersSchema = pgSchema('orders');

export const ordersTable = ordersSchema.table('orders', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  items: jsonb('items').$type<Array<{ sku: string; quantity: number; unitPrice: number }>>().notNull(),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  shippingAddress: jsonb('shipping_address').$type<{
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }>().notNull(),
  status: text('status').notNull(),
  paymentId: text('payment_id'),
  shipmentId: text('shipment_id'),
  cancellationReason: text('cancellation_reason'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});
