import { Kafka, Producer } from 'kafkajs';
import type { DomainEvent } from '../event-bus/domain-event.interface';
import { injectTraceContext } from '../observability';

export class KafkaEventPublisher {
  private producer: Producer;

  constructor(brokers: string[], clientId = 'tiny-store') {
    const kafka = new Kafka({ clientId, brokers });
    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  async publish(topic: string, event: DomainEvent): Promise<void> {
    const headers = injectTraceContext({});
    await this.producer.send({
      topic,
      messages: [
        {
          key: event.aggregateId,
          value: JSON.stringify(event),
          headers,
        },
      ],
    });
  }
}
