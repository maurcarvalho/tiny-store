import { createTestDb, closeTestDb, type TestDbHandle } from '@tiny-store/shared-testing';
import { Address, Money } from '@tiny-store/shared-domain';
import { OrderRepository } from './order.repository';
import { ordersTable } from '../../db/schema';
import { Order } from '../entities/order';
import { CustomerId } from '../value-objects/customer-id.value-object';
import { OrderItem } from '../value-objects/order-item.value-object';
import { OrderStatus } from '../enums/order-status.enum';

const makeAddress = () =>
  Address.create('123 Main St', 'Springfield', 'IL', '62704', 'USA');

const makeItems = () => [
  OrderItem.create('SKU-001', 2, Money.create(10)),
  OrderItem.create('SKU-002', 1, Money.create(25)),
];

describe('OrderRepository', () => {
  let handle: TestDbHandle;
  let repository: OrderRepository;

  beforeAll(async () => {
    handle = await createTestDb();
    repository = new OrderRepository(handle.db);
  });

  afterAll(async () => {
    await closeTestDb(handle);
  });

  beforeEach(async () => {
    await handle.db.delete(ordersTable);
  });

  describe('save()', () => {
    it('should create a new order and persist it', async () => {
      const order = Order.create(
        CustomerId.create('customer-1'),
        makeItems(),
        makeAddress()
      );

      await repository.save(order);

      const found = await repository.findById(order.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(order.id);
      expect(found!.customerId.value).toBe('customer-1');
      expect(found!.status).toBe(OrderStatus.PENDING);
      expect(found!.items).toHaveLength(2);
      expect(found!.items[0].sku).toBe('SKU-001');
      expect(found!.items[0].quantity).toBe(2);
      expect(found!.items[0].unitPrice.amount).toBe(10);
      expect(found!.shippingAddress.street).toBe('123 Main St');
      expect(found!.shippingAddress.country).toBe('USA');
      expect(found!.paymentId).toBeNull();
      expect(found!.shipmentId).toBeNull();
    });

    it('should upsert when saving the same order twice', async () => {
      const order = Order.create(
        CustomerId.create('customer-upsert'),
        makeItems(),
        makeAddress()
      );
      await repository.save(order);

      order.confirm();
      order.markAsPaid('payment-123');
      await repository.save(order);

      const found = await repository.findById(order.id);
      expect(found).not.toBeNull();
      expect(found!.status).toBe(OrderStatus.PAID);
      expect(found!.paymentId).toBe('payment-123');

      const all = await repository.findAll();
      expect(all).toHaveLength(1);
    });
  });

  describe('findById()', () => {
    it('should return the order when it exists', async () => {
      const order = Order.create(
        CustomerId.create('customer-find'),
        makeItems(),
        makeAddress()
      );
      await repository.save(order);

      const found = await repository.findById(order.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(order.id);
    });

    it('should return null when the order does not exist', async () => {
      const found = await repository.findById('non-existent-id');

      expect(found).toBeNull();
    });
  });

  describe('findByCustomerId()', () => {
    it('should return orders sorted by createdAt descending', async () => {
      const customerId = CustomerId.create('customer-multi');

      const older = Order.create(customerId, makeItems(), makeAddress());
      await repository.save(older);

      await new Promise((resolve) => setTimeout(resolve, 5));

      const newer = Order.create(customerId, makeItems(), makeAddress());
      await repository.save(newer);

      await new Promise((resolve) => setTimeout(resolve, 5));

      const newest = Order.create(customerId, makeItems(), makeAddress());
      await repository.save(newest);

      const other = Order.create(
        CustomerId.create('different-customer'),
        makeItems(),
        makeAddress()
      );
      await repository.save(other);

      const results = await repository.findByCustomerId('customer-multi');

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe(newest.id);
      expect(results[1].id).toBe(newer.id);
      expect(results[2].id).toBe(older.id);
    });

    it('should return an empty array when the customer has no orders', async () => {
      const results = await repository.findByCustomerId('no-orders');

      expect(results).toEqual([]);
    });
  });

  describe('findByStatus()', () => {
    it('should only return orders with the requested status', async () => {
      const pending = Order.create(
        CustomerId.create('c-pending'),
        makeItems(),
        makeAddress()
      );
      await repository.save(pending);

      const confirmed = Order.create(
        CustomerId.create('c-confirmed'),
        makeItems(),
        makeAddress()
      );
      confirmed.confirm();
      await repository.save(confirmed);

      const rejected = Order.create(
        CustomerId.create('c-rejected'),
        makeItems(),
        makeAddress()
      );
      rejected.reject('out of stock');
      await repository.save(rejected);

      const confirmedResults = await repository.findByStatus(OrderStatus.CONFIRMED);
      expect(confirmedResults).toHaveLength(1);
      expect(confirmedResults[0].id).toBe(confirmed.id);

      const pendingResults = await repository.findByStatus(OrderStatus.PENDING);
      expect(pendingResults).toHaveLength(1);
      expect(pendingResults[0].id).toBe(pending.id);

      const rejectedResults = await repository.findByStatus(OrderStatus.REJECTED);
      expect(rejectedResults).toHaveLength(1);
      expect(rejectedResults[0].id).toBe(rejected.id);
      expect(rejectedResults[0].rejectionReason).toBe('out of stock');
    });

    it('should return an empty array when no orders match', async () => {
      const order = Order.create(
        CustomerId.create('c-1'),
        makeItems(),
        makeAddress()
      );
      await repository.save(order);

      const results = await repository.findByStatus(OrderStatus.SHIPPED);
      expect(results).toEqual([]);
    });
  });

  describe('findAll()', () => {
    it('should return every persisted order sorted by createdAt descending', async () => {
      const first = Order.create(
        CustomerId.create('c-first'),
        makeItems(),
        makeAddress()
      );
      await repository.save(first);

      await new Promise((resolve) => setTimeout(resolve, 5));

      const second = Order.create(
        CustomerId.create('c-second'),
        makeItems(),
        makeAddress()
      );
      await repository.save(second);

      await new Promise((resolve) => setTimeout(resolve, 5));

      const third = Order.create(
        CustomerId.create('c-third'),
        makeItems(),
        makeAddress()
      );
      await repository.save(third);

      const results = await repository.findAll();

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe(third.id);
      expect(results[1].id).toBe(second.id);
      expect(results[2].id).toBe(first.id);
    });
  });
});
