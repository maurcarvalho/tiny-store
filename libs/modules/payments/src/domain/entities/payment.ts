import { AggregateRoot, BusinessRuleViolationError, Money } from '@tiny-store/shared-domain';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentMethod } from '../value-objects/payment-method.value-object';
import { v4 as uuidv4 } from 'uuid';

export class Payment extends AggregateRoot {
  private static readonly MAX_RETRY_ATTEMPTS = 3;

  private constructor(
    id: string,
    public readonly orderId: string,
    public readonly amount: Money,
    public readonly paymentMethod: PaymentMethod,
    public status: PaymentStatus,
    public failureReason: string | null,
    public processingAttempts: number,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {
    super(id);
  }

  static create(orderId: string, amount: Money, paymentMethod: PaymentMethod): Payment {
    const now = new Date();
    return new Payment(
      uuidv4(),
      orderId,
      amount,
      paymentMethod,
      PaymentStatus.PENDING,
      null,
      0,
      now,
      now
    );
  }

  static reconstitute(
    id: string,
    orderId: string,
    amount: Money,
    paymentMethod: PaymentMethod,
    status: PaymentStatus,
    failureReason: string | null,
    processingAttempts: number,
    createdAt: Date,
    updatedAt: Date
  ): Payment {
    return new Payment(
      id,
      orderId,
      amount,
      paymentMethod,
      status,
      failureReason,
      processingAttempts,
      createdAt,
      updatedAt
    );
  }

  startProcessing(): void {
    if (this.status !== PaymentStatus.PENDING && this.status !== PaymentStatus.FAILED) {
      throw new BusinessRuleViolationError(
        `Cannot start processing payment in ${this.status} status`
      );
    }

    this.status = PaymentStatus.PROCESSING;
    this.processingAttempts++;
    this.updatedAt = new Date();
  }

  markAsSucceeded(): void {
    if (this.status !== PaymentStatus.PROCESSING) {
      throw new BusinessRuleViolationError(
        `Cannot mark payment as succeeded in ${this.status} status`
      );
    }

    this.status = PaymentStatus.SUCCEEDED;
    this.failureReason = null;
    this.updatedAt = new Date();
  }

  markAsFailed(reason: string): void {
    if (this.status !== PaymentStatus.PROCESSING) {
      throw new BusinessRuleViolationError(
        `Cannot mark payment as failed in ${this.status} status`
      );
    }

    this.status = PaymentStatus.FAILED;
    this.failureReason = reason;
    this.updatedAt = new Date();
  }

  retry(): void {
    if (!this.canBeRetried()) {
      throw new BusinessRuleViolationError(
        `Payment cannot be retried. Status: ${this.status}, Attempts: ${this.processingAttempts}`
      );
    }

    this.status = PaymentStatus.PENDING;
    this.failureReason = null;
    this.updatedAt = new Date();
  }

  canBeProcessed(): boolean {
    return this.status === PaymentStatus.PENDING;
  }

  canBeRetried(): boolean {
    return (
      this.status === PaymentStatus.FAILED &&
      this.processingAttempts < Payment.MAX_RETRY_ATTEMPTS
    );
  }

  calculateProcessingFee(): Money {
    // Simple 2.9% + $0.30 fee
    const percentageFee = this.amount.multiply(0.029);
    const fixedFee = Money.create(0.30);
    return percentageFee.add(fixedFee);
  }
}

