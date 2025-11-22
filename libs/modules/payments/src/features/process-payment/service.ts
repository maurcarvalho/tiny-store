import { DataSource } from 'typeorm';
import { PaymentRepository } from '../../domain/repositories/payment.repository';
import { Payment } from '../../domain/entities/payment';
import { PaymentMethod } from '../../domain/value-objects/payment-method.value-object';
import { PaymentProcessor } from '../../domain/services/payment-processor.service';
import { Money } from '@tiny-store/shared-domain';
import { EventBus } from '@tiny-store/shared-infrastructure';
import { ProcessPaymentDto, ProcessPaymentResponse } from './dto';
import {
  createPaymentProcessedEvent,
  PaymentProcessedPayload,
} from '../../domain/events/payment-processed.event';
import {
  createPaymentFailedEvent,
  PaymentFailedPayload,
} from '../../domain/events/payment-failed.event';

export class ProcessPaymentService {
  private paymentRepository: PaymentRepository;
  private paymentProcessor: PaymentProcessor;
  private eventBus: EventBus;

  constructor(dataSource: DataSource) {
    this.paymentRepository = new PaymentRepository(dataSource);
    this.paymentProcessor = new PaymentProcessor(0.9); // 90% success rate
    this.eventBus = EventBus.getInstance();
  }

  async execute(dto: ProcessPaymentDto): Promise<ProcessPaymentResponse> {
    const amount = Money.create(dto.amount);
    const paymentMethod = PaymentMethod.createDefault();

    const payment = Payment.create(dto.orderId, amount, paymentMethod);

    payment.startProcessing();
    await this.paymentRepository.save(payment);

    // Process payment using mock processor
    const result = await this.paymentProcessor.processPayment(
      dto.amount,
      paymentMethod.type
    );

    if (result.success) {
      payment.markAsSucceeded();
      await this.paymentRepository.save(payment);

      // Publish PaymentProcessed event
      const payload: PaymentProcessedPayload = {
        paymentId: payment.id,
        orderId: payment.orderId,
        amount: payment.amount.amount,
        method: payment.paymentMethod.type,
      };

      const event = createPaymentProcessedEvent(payment.id, payload);
      await this.eventBus.publish(event);

      return {
        paymentId: payment.id,
        status: payment.status,
        success: true,
      };
    } else {
      payment.markAsFailed(result.errorMessage || 'Payment processing failed');
      await this.paymentRepository.save(payment);

      // Publish PaymentFailed event
      const payload: PaymentFailedPayload = {
        paymentId: payment.id,
        orderId: payment.orderId,
        reason: result.errorMessage || 'Payment processing failed',
      };

      const event = createPaymentFailedEvent(payment.id, payload);
      await this.eventBus.publish(event);

      return {
        paymentId: payment.id,
        status: payment.status,
        success: false,
        errorMessage: result.errorMessage,
      };
    }
  }
}

