import { createTestDb, closeTestDb, type TestDbHandle } from '@tiny-store/shared-testing';
import { Money } from '@tiny-store/shared-domain';
import { PaymentRepository } from './payment.repository';
import { paymentsTable } from '../../db/schema';
import { Payment } from '../entities/payment';
import { PaymentMethod } from '../value-objects/payment-method.value-object';
import { PaymentStatus } from '../enums/payment-status.enum';

describe('PaymentRepository', () => {
  let handle: TestDbHandle;
  let repository: PaymentRepository;

  beforeAll(async () => {
    handle = await createTestDb();
    repository = new PaymentRepository(handle.db);
  });

  afterAll(async () => {
    await closeTestDb(handle);
  });

  beforeEach(async () => {
    await handle.db.delete(paymentsTable);
  });

  describe('save()', () => {
    it('should create a new payment and persist it', async () => {
      const payment = Payment.create(
        'order-1',
        Money.create(100),
        PaymentMethod.createCreditCard('1234')
      );

      await repository.save(payment);

      const found = await repository.findById(payment.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(payment.id);
      expect(found!.orderId).toBe('order-1');
      expect(found!.amount.amount).toBe(100);
      expect(found!.status).toBe(PaymentStatus.PENDING);
      expect(found!.failureReason).toBeNull();
      expect(found!.processingAttempts).toBe(0);
      expect(found!.createdAt).toBeInstanceOf(Date);
      expect(found!.updatedAt).toBeInstanceOf(Date);
    });

    it('should upsert when saving the same payment twice', async () => {
      const payment = Payment.create(
        'order-upsert',
        Money.create(50),
        PaymentMethod.createDefault()
      );
      await repository.save(payment);

      payment.startProcessing();
      await repository.save(payment);

      const found = await repository.findById(payment.id);
      expect(found).not.toBeNull();
      expect(found!.status).toBe(PaymentStatus.PROCESSING);
      expect(found!.processingAttempts).toBe(1);

      const allRows = await handle.db.select().from(paymentsTable);
      expect(allRows).toHaveLength(1);
    });
  });

  describe('findById()', () => {
    it('should return the payment when it exists', async () => {
      const payment = Payment.create(
        'order-find',
        Money.create(75),
        PaymentMethod.createDefault()
      );
      await repository.save(payment);

      const found = await repository.findById(payment.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(payment.id);
      expect(found!.orderId).toBe('order-find');
    });

    it('should return null when the payment does not exist', async () => {
      const found = await repository.findById('non-existent-id');

      expect(found).toBeNull();
    });
  });

  describe('findByOrderId()', () => {
    it('should return the payment when one exists for the order', async () => {
      const payment = Payment.create(
        'order-lookup',
        Money.create(200),
        PaymentMethod.createDefault()
      );
      await repository.save(payment);

      const found = await repository.findByOrderId('order-lookup');

      expect(found).not.toBeNull();
      expect(found!.id).toBe(payment.id);
      expect(found!.orderId).toBe('order-lookup');
      expect(found!.amount.amount).toBe(200);
    });

    it('should return null when no payment exists for the order', async () => {
      const found = await repository.findByOrderId('no-such-order');

      expect(found).toBeNull();
    });
  });
});
