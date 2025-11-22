import { DataSource, Repository } from 'typeorm';
import { Payment } from '../entities/payment';
import { PaymentEntity } from '../entities/payment.entity';
import { PaymentMethod } from '../value-objects/payment-method.value-object';
import { PaymentStatus } from '../enums/payment-status.enum';
import { Money } from '@tiny-store/shared-domain';

export class PaymentRepository {
  private repository: Repository<PaymentEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(PaymentEntity);
  }

  async save(payment: Payment): Promise<void> {
    const entity = this.repository.create({
      id: payment.id,
      orderId: payment.orderId,
      amount: payment.amount.amount,
      status: payment.status,
      paymentMethod: {
        type: payment.paymentMethod.type,
        details: payment.paymentMethod.details,
      },
      failureReason: payment.failureReason ?? undefined,
      processingAttempts: payment.processingAttempts,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    });

    await this.repository.save(entity);
  }

  async findById(id: string): Promise<Payment | null> {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      return null;
    }

    return this.toDomain(entity);
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    const entity = await this.repository.findOne({ where: { orderId } });

    if (!entity) {
      return null;
    }

    return this.toDomain(entity);
  }

  private toDomain(entity: PaymentEntity): Payment {
    const paymentMethod =
      entity.paymentMethod.type === 'CREDIT_CARD'
        ? PaymentMethod.createDefault()
        : PaymentMethod.createDefault();

    return Payment.reconstitute(
      entity.id,
      entity.orderId,
      Money.create(entity.amount),
      paymentMethod,
      entity.status as PaymentStatus,
      entity.failureReason ?? null,
      entity.processingAttempts,
      entity.createdAt,
      entity.updatedAt
    );
  }
}

