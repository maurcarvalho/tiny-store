import { Entity } from './entity.base';
import { DomainEvent } from '@tiny-store/shared-infrastructure';

export abstract class AggregateRoot extends Entity {
  private domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  public getDomainEvents(): DomainEvent[] {
    return [...this.domainEvents];
  }

  public clearDomainEvents(): void {
    this.domainEvents = [];
  }
}

