import { Money, BusinessRuleViolationError } from '@tiny-store/shared-domain';
import { Payment } from './payment';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentMethod } from '../value-objects/payment-method.value-object';

describe('Payment Domain Entity', () => {
  const createValidPayment = (): Payment => {
    return Payment.create('order-123', Money.create(100), PaymentMethod.createDefault());
  };

  describe('Payment Creation', () => {
    it('should create a payment with PENDING status', () => {
      const payment = createValidPayment();

      expect(payment).toBeDefined();
      expect(payment.id).toBeDefined();
      expect(payment.status).toBe(PaymentStatus.PENDING);
    });

    it('should set the correct order ID', () => {
      const payment = createValidPayment();

      expect(payment.orderId).toBe('order-123');
    });

    it('should set the correct amount', () => {
      const payment = createValidPayment();

      expect(payment.amount.amount).toBe(100);
    });

    it('should initialize with zero processing attempts', () => {
      const payment = createValidPayment();

      expect(payment.processingAttempts).toBe(0);
    });

    it('should initialize with null failure reason', () => {
      const payment = createValidPayment();

      expect(payment.failureReason).toBeNull();
    });
  });

  describe('Processing', () => {
    it('should start processing from PENDING', () => {
      const payment = createValidPayment();

      payment.startProcessing();

      expect(payment.status).toBe(PaymentStatus.PROCESSING);
      expect(payment.processingAttempts).toBe(1);
    });

    it('should throw error when starting processing from SUCCEEDED', () => {
      const payment = createValidPayment();
      payment.startProcessing();
      payment.markAsSucceeded();

      expect(() => {
        payment.startProcessing();
      }).toThrow(BusinessRuleViolationError);
    });

    it('should throw error when starting processing from PROCESSING', () => {
      const payment = createValidPayment();
      payment.startProcessing();

      expect(() => {
        payment.startProcessing();
      }).toThrow(BusinessRuleViolationError);
    });
  });

  describe('Success', () => {
    it('should mark as succeeded from PROCESSING', () => {
      const payment = createValidPayment();
      payment.startProcessing();

      payment.markAsSucceeded();

      expect(payment.status).toBe(PaymentStatus.SUCCEEDED);
      expect(payment.failureReason).toBeNull();
    });

    it('should throw error when marking succeeded from PENDING', () => {
      const payment = createValidPayment();

      expect(() => {
        payment.markAsSucceeded();
      }).toThrow(BusinessRuleViolationError);
    });

    it('should throw error when marking succeeded from FAILED', () => {
      const payment = createValidPayment();
      payment.startProcessing();
      payment.markAsFailed('Card declined');

      expect(() => {
        payment.markAsSucceeded();
      }).toThrow(BusinessRuleViolationError);
    });
  });

  describe('Failure', () => {
    it('should mark as failed from PROCESSING with reason', () => {
      const payment = createValidPayment();
      payment.startProcessing();

      payment.markAsFailed('Card declined');

      expect(payment.status).toBe(PaymentStatus.FAILED);
      expect(payment.failureReason).toBe('Card declined');
    });

    it('should throw error when marking failed from PENDING', () => {
      const payment = createValidPayment();

      expect(() => {
        payment.markAsFailed('Some reason');
      }).toThrow(BusinessRuleViolationError);
    });

    it('should throw error when marking failed from SUCCEEDED', () => {
      const payment = createValidPayment();
      payment.startProcessing();
      payment.markAsSucceeded();

      expect(() => {
        payment.markAsFailed('Some reason');
      }).toThrow(BusinessRuleViolationError);
    });
  });

  describe('Retry', () => {
    it('should retry from FAILED and reset to PENDING', () => {
      const payment = createValidPayment();
      payment.startProcessing();
      payment.markAsFailed('Card declined');

      payment.retry();

      expect(payment.status).toBe(PaymentStatus.PENDING);
      expect(payment.failureReason).toBeNull();
    });

    it('should throw error when max retries exceeded', () => {
      const payment = createValidPayment();

      // Attempt 1
      payment.startProcessing();
      payment.markAsFailed('Fail 1');
      payment.retry();

      // Attempt 2
      payment.startProcessing();
      payment.markAsFailed('Fail 2');
      payment.retry();

      // Attempt 3
      payment.startProcessing();
      payment.markAsFailed('Fail 3');

      // Should not be able to retry after 3 attempts
      expect(() => {
        payment.retry();
      }).toThrow(BusinessRuleViolationError);
    });

    it('should throw error when retrying from PENDING', () => {
      const payment = createValidPayment();

      expect(() => {
        payment.retry();
      }).toThrow(BusinessRuleViolationError);
    });

    it('should throw error when retrying from PROCESSING', () => {
      const payment = createValidPayment();
      payment.startProcessing();

      expect(() => {
        payment.retry();
      }).toThrow(BusinessRuleViolationError);
    });

    it('should throw error when retrying from SUCCEEDED', () => {
      const payment = createValidPayment();
      payment.startProcessing();
      payment.markAsSucceeded();

      expect(() => {
        payment.retry();
      }).toThrow(BusinessRuleViolationError);
    });
  });

  describe('State Checks', () => {
    it('canBeProcessed should return true for PENDING', () => {
      const payment = createValidPayment();

      expect(payment.canBeProcessed()).toBe(true);
    });

    it('canBeProcessed should return false for PROCESSING', () => {
      const payment = createValidPayment();
      payment.startProcessing();

      expect(payment.canBeProcessed()).toBe(false);
    });

    it('canBeProcessed should return false for SUCCEEDED', () => {
      const payment = createValidPayment();
      payment.startProcessing();
      payment.markAsSucceeded();

      expect(payment.canBeProcessed()).toBe(false);
    });

    it('canBeRetried should return true for FAILED with attempts remaining', () => {
      const payment = createValidPayment();
      payment.startProcessing();
      payment.markAsFailed('Card declined');

      expect(payment.canBeRetried()).toBe(true);
    });

    it('canBeRetried should return false for PENDING', () => {
      const payment = createValidPayment();

      expect(payment.canBeRetried()).toBe(false);
    });

    it('canBeRetried should return false when max attempts reached', () => {
      const payment = createValidPayment();

      payment.startProcessing();
      payment.markAsFailed('Fail 1');
      payment.retry();
      payment.startProcessing();
      payment.markAsFailed('Fail 2');
      payment.retry();
      payment.startProcessing();
      payment.markAsFailed('Fail 3');

      expect(payment.canBeRetried()).toBe(false);
    });
  });

  describe('Processing Fee', () => {
    it('should calculate 2.9% + $0.30 fee correctly', () => {
      const payment = createValidPayment(); // amount = 100

      const fee = payment.calculateProcessingFee();

      // 100 * 0.029 + 0.30 = 3.20
      expect(fee.amount).toBeCloseTo(3.20, 2);
    });

    it('should calculate fee for different amounts', () => {
      const payment = Payment.create('order-456', Money.create(50), PaymentMethod.createDefault());

      const fee = payment.calculateProcessingFee();

      // 50 * 0.029 + 0.30 = 1.75
      expect(fee.amount).toBeCloseTo(1.75, 2);
    });
  });

  describe('Payment State Machine', () => {
    it('should follow happy path: PENDING → PROCESSING → SUCCEEDED', () => {
      const payment = createValidPayment();
      expect(payment.status).toBe(PaymentStatus.PENDING);

      payment.startProcessing();
      expect(payment.status).toBe(PaymentStatus.PROCESSING);

      payment.markAsSucceeded();
      expect(payment.status).toBe(PaymentStatus.SUCCEEDED);
    });

    it('should follow failure path: PENDING → PROCESSING → FAILED', () => {
      const payment = createValidPayment();
      expect(payment.status).toBe(PaymentStatus.PENDING);

      payment.startProcessing();
      expect(payment.status).toBe(PaymentStatus.PROCESSING);

      payment.markAsFailed('Card declined');
      expect(payment.status).toBe(PaymentStatus.FAILED);
    });

    it('should follow retry path: FAILED → PENDING → PROCESSING → SUCCEEDED', () => {
      const payment = createValidPayment();
      payment.startProcessing();
      payment.markAsFailed('Card declined');
      expect(payment.status).toBe(PaymentStatus.FAILED);

      payment.retry();
      expect(payment.status).toBe(PaymentStatus.PENDING);

      payment.startProcessing();
      expect(payment.status).toBe(PaymentStatus.PROCESSING);

      payment.markAsSucceeded();
      expect(payment.status).toBe(PaymentStatus.SUCCEEDED);
    });
  });
});
