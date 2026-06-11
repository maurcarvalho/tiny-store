import { eq, desc, asc } from 'drizzle-orm';
import type { DrizzleDb } from '../database/database.config';
import { eventStoreTable } from './schema';
import { DomainEvent } from '../event-bus/domain-event.interface';

export class EventStoreRepository {
  constructor(private db: DrizzleDb) {}

  async save(event: DomainEvent): Promise<void> {
    await this.db.insert(eventStoreTable).values({
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      occurredAt: event.occurredAt,
      payload: event.payload,
      version: event.version,
    });
  }

  async findAll(): Promise<DomainEvent[]> {
    const rows = await this.db
      .select()
      .from(eventStoreTable)
      .orderBy(desc(eventStoreTable.occurredAt));
    return rows.map(this.toDomainEvent);
  }

  async findByAggregateId(aggregateId: string): Promise<DomainEvent[]> {
    const rows = await this.db
      .select()
      .from(eventStoreTable)
      .where(eq(eventStoreTable.aggregateId, aggregateId))
      .orderBy(asc(eventStoreTable.occurredAt));
    return rows.map(this.toDomainEvent);
  }

  async findByEventType(eventType: string): Promise<DomainEvent[]> {
    const rows = await this.db
      .select()
      .from(eventStoreTable)
      .where(eq(eventStoreTable.eventType, eventType))
      .orderBy(desc(eventStoreTable.occurredAt));
    return rows.map(this.toDomainEvent);
  }

  async findById(eventId: string): Promise<DomainEvent | null> {
    const rows = await this.db
      .select()
      .from(eventStoreTable)
      .where(eq(eventStoreTable.eventId, eventId));
    return rows.length > 0 ? this.toDomainEvent(rows[0]) : null;
  }

  private toDomainEvent(row: typeof eventStoreTable.$inferSelect): DomainEvent {
    return {
      eventId: row.eventId,
      eventType: row.eventType,
      aggregateId: row.aggregateId,
      aggregateType: row.aggregateType,
      occurredAt: row.occurredAt,
      payload: row.payload,
      version: row.version,
    };
  }
}
