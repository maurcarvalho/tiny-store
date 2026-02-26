import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { PaymentRepository } from '../../domain/repositories/payment.repository';
import { NotFoundError } from '@tiny-store/shared-domain';
import { GetPaymentResponse } from './dto';

export class GetPaymentService {
  private paymentRepository: PaymentRepository;

  constructor(db: DrizzleDb) {
    this.paymentRepository = new PaymentRepository(db);
  }

  async execute(paymentId: string): Promise<GetPaymentResponse> {
    const payment = await this.paymentRepository.findById(paymentId);

    if (!payment) {
      throw new NotFoundError(`Payment ${paymentId} not found`);
    }

    return {
      paymentId: payment.id,
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
    };
  }
}

