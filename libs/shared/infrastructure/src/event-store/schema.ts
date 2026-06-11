import { pgTable, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

export const eventStoreTable = pgTable('event_store', {
  eventId: text('event_id').primaryKey(),
  eventType: text('event_type').notNull(),
  aggregateId: text('aggregate_id').notNull(),
  aggregateType: text('aggregate_type').notNull(),
  occurredAt: timestamp('occurred_at').notNull().defaultNow(),
  payload: jsonb('payload').$type<Record<string, any>>().notNull(),
  version: integer('version').notNull().default(1),
});
