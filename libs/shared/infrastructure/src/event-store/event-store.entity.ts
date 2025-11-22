import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('event_store')
export class EventStoreEntity {
  @PrimaryColumn()
  eventId!: string;

  @Column()
  eventType!: string;

  @Column()
  aggregateId!: string;

  @Column()
  aggregateType!: string;

  @CreateDateColumn()
  occurredAt!: Date;

  @Column('simple-json')
  payload!: Record<string, any>;

  @Column({ default: 1 })
  version!: number;
}

