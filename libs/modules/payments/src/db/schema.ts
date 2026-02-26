import { pgSchema, text, numeric, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';

const paymentsSchema = pgSchema('payments');

export const paymentsTable = paymentsSchema.table('payments', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull(),
  paymentMethod: jsonb('payment_method').$type<{
    type: string;
    details: string;
  }>().notNull(),
  failureReason: text('failure_reason'),
  processingAttempts: integer('processing_attempts').notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});
