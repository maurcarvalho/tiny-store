import { eq } from 'drizzle-orm';
import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { paymentsTable } from '../../db/schema';
import { Payment } from '../entities/payment';
import { PaymentMethod } from '../value-objects/payment-method.value-object';
import { PaymentStatus } from '../enums/payment-status.enum';
import { Money } from '@tiny-store/shared-domain';

export class PaymentRepository {
  constructor(private db: DrizzleDb) {}

  async save(payment: Payment): Promise<void> {
    await this.db.insert(paymentsTable).values({
      id: payment.id,
      orderId: payment.orderId,
      amount: String(payment.amount.amount),
      status: payment.status,
      paymentMethod: {
        type: payment.paymentMethod.type,
        details: payment.paymentMethod.details,
      },
      failureReason: payment.failureReason ?? null,
      processingAttempts: payment.processingAttempts,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    }).onConflictDoUpdate({
      target: paymentsTable.id,
      set: {
        orderId: payment.orderId,
        amount: String(payment.amount.amount),
        status: payment.status,
        paymentMethod: {
          type: payment.paymentMethod.type,
          details: payment.paymentMethod.details,
        },
        failureReason: payment.failureReason ?? null,
        processingAttempts: payment.processingAttempts,
        updatedAt: payment.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<Payment | null> {
    const rows = await this.db.select().from(paymentsTable).where(eq(paymentsTable.id, id));
    return rows.length > 0 ? this.toDomain(rows[0]) : null;
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    const rows = await this.db.select().from(paymentsTable).where(eq(paymentsTable.orderId, orderId));
    return rows.length > 0 ? this.toDomain(rows[0]) : null;
  }

  private toDomain(row: typeof paymentsTable.$inferSelect): Payment {
    const pm = row.paymentMethod as { type: string; details: string };
    const paymentMethod =
      pm.type === 'CREDIT_CARD'
        ? PaymentMethod.createDefault()
        : PaymentMethod.createDefault();

    return Payment.reconstitute(
      row.id,
      row.orderId,
      Money.create(Number(row.amount)),
      paymentMethod,
      row.status as PaymentStatus,
      row.failureReason ?? null,
      row.processingAttempts,
      row.createdAt,
      row.updatedAt
    );
  }
}
