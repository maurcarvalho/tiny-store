import { createTestDb, closeTestDb, type TestDbHandle } from '@tiny-store/shared-testing';
import { Address } from '@tiny-store/shared-domain';
import { ShipmentRepository } from './shipment.repository';
import { shipmentsTable } from '../../db/schema';
import { Shipment } from '../entities/shipment';
import { ShipmentStatus } from '../enums/shipment-status.enum';

const makeAddress = () =>
  Address.create('123 Main St', 'Springfield', 'IL', '62704', 'USA');

describe('ShipmentRepository', () => {
  let handle: TestDbHandle;
  let repository: ShipmentRepository;

  beforeAll(async () => {
    handle = await createTestDb();
    repository = new ShipmentRepository(handle.db);
  });

  afterAll(async () => {
    await closeTestDb(handle);
  });

  beforeEach(async () => {
    await handle.db.delete(shipmentsTable);
  });

  describe('save()', () => {
    it('should create a new shipment and persist it', async () => {
      const shipment = Shipment.create('order-1', makeAddress());

      await repository.save(shipment);

      const found = await repository.findById(shipment.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(shipment.id);
      expect(found!.orderId).toBe('order-1');
      expect(found!.trackingNumber.value).toBe(shipment.trackingNumber.value);
      expect(found!.status).toBe(ShipmentStatus.PENDING);
      expect(found!.shippingAddress.street).toBe('123 Main St');
      expect(found!.shippingAddress.country).toBe('USA');
      expect(found!.dispatchedAt).toBeNull();
      expect(found!.deliveredAt).toBeNull();
      expect(found!.estimatedDeliveryDate).toBeInstanceOf(Date);
      expect(found!.createdAt).toBeInstanceOf(Date);
      expect(found!.updatedAt).toBeInstanceOf(Date);
    });

    it('should upsert when saving the same shipment twice', async () => {
      const shipment = Shipment.create('order-upsert', makeAddress());
      await repository.save(shipment);

      shipment.dispatch();
      await repository.save(shipment);

      const found = await repository.findById(shipment.id);
      expect(found).not.toBeNull();
      expect(found!.status).toBe(ShipmentStatus.IN_TRANSIT);
      expect(found!.dispatchedAt).toBeInstanceOf(Date);

      const allRows = await handle.db.select().from(shipmentsTable);
      expect(allRows).toHaveLength(1);
    });
  });

  describe('findById()', () => {
    it('should return the shipment when it exists', async () => {
      const shipment = Shipment.create('order-find', makeAddress());
      await repository.save(shipment);

      const found = await repository.findById(shipment.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(shipment.id);
    });

    it('should return null when the shipment does not exist', async () => {
      const found = await repository.findById('non-existent-id');

      expect(found).toBeNull();
    });
  });

  describe('findByOrderId()', () => {
    it('should return the shipment when one exists for the order', async () => {
      const shipment = Shipment.create('order-lookup', makeAddress());
      await repository.save(shipment);

      const found = await repository.findByOrderId('order-lookup');

      expect(found).not.toBeNull();
      expect(found!.id).toBe(shipment.id);
      expect(found!.orderId).toBe('order-lookup');
    });

    it('should return null when no shipment exists for the order', async () => {
      const found = await repository.findByOrderId('no-such-order');

      expect(found).toBeNull();
    });
  });

  describe('findByTrackingNumber()', () => {
    it('should return the shipment when one matches the tracking number', async () => {
      const shipment = Shipment.create('order-track', makeAddress());
      await repository.save(shipment);

      const found = await repository.findByTrackingNumber(
        shipment.trackingNumber.value
      );

      expect(found).not.toBeNull();
      expect(found!.id).toBe(shipment.id);
      expect(found!.trackingNumber.value).toBe(shipment.trackingNumber.value);
    });

    it('should return null when no shipment matches the tracking number', async () => {
      const found = await repository.findByTrackingNumber('TRK-DOES-NOT-EXIST');

      expect(found).toBeNull();
    });
  });
});
