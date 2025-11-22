import { Repository, DataSource } from 'typeorm';
import { EventStoreEntity } from './event-store.entity';
import { DomainEvent } from '../event-bus/domain-event.interface';

export class EventStoreRepository {
  private repository: Repository<EventStoreEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(EventStoreEntity);
  }

  async save(event: DomainEvent): Promise<void> {
    const entity = this.repository.create({
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      occurredAt: event.occurredAt,
      payload: event.payload,
      version: event.version,
    });
    
    await this.repository.save(entity);
  }

  async findAll(): Promise<DomainEvent[]> {
    const entities = await this.repository.find({
      order: { occurredAt: 'DESC' },
    });
    
    return entities.map(this.toDomainEvent);
  }

  async findByAggregateId(aggregateId: string): Promise<DomainEvent[]> {
    const entities = await this.repository.find({
      where: { aggregateId },
      order: { occurredAt: 'ASC' },
    });
    
    return entities.map(this.toDomainEvent);
  }

  async findByEventType(eventType: string): Promise<DomainEvent[]> {
    const entities = await this.repository.find({
      where: { eventType },
      order: { occurredAt: 'DESC' },
    });
    
    return entities.map(this.toDomainEvent);
  }

  async findById(eventId: string): Promise<DomainEvent | null> {
    const entity = await this.repository.findOne({
      where: { eventId },
    });
    
    return entity ? this.toDomainEvent(entity) : null;
  }

  private toDomainEvent(entity: EventStoreEntity): DomainEvent {
    return {
      eventId: entity.eventId,
      eventType: entity.eventType,
      aggregateId: entity.aggregateId,
      aggregateType: entity.aggregateType,
      occurredAt: entity.occurredAt,
      payload: entity.payload,
      version: entity.version,
    };
  }
}

