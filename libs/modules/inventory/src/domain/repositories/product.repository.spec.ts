import { createTestDb, closeTestDb, type TestDbHandle } from '@tiny-store/shared-testing';
import { ProductRepository } from './product.repository';
import { productsTable } from '../../db/schema';
import { Product } from '../entities/product';
import { Sku } from '../value-objects/sku.value-object';
import { ProductStatus } from '../enums/product-status.enum';

describe('ProductRepository', () => {
  let handle: TestDbHandle;
  let repository: ProductRepository;

  beforeAll(async () => {
    handle = await createTestDb();
    repository = new ProductRepository(handle.db);
  });

  afterAll(async () => {
    await closeTestDb(handle);
  });

  beforeEach(async () => {
    await handle.db.delete(productsTable);
  });

  describe('save()', () => {
    it('should create a new product and persist it', async () => {
      const product = Product.create(Sku.create('SKU-001'), 'Widget', 100);

      await repository.save(product);

      const found = await repository.findById(product.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(product.id);
      expect(found!.sku.value).toBe('SKU-001');
      expect(found!.name).toBe('Widget');
      expect(found!.stockQuantity).toBe(100);
      expect(found!.reservedQuantity).toBe(0);
      expect(found!.status).toBe(ProductStatus.ACTIVE);
      expect(found!.createdAt).toBeInstanceOf(Date);
      expect(found!.updatedAt).toBeInstanceOf(Date);
    });

    it('should upsert when saving the same product twice', async () => {
      const product = Product.create(Sku.create('SKU-002'), 'Gadget', 50);
      await repository.save(product);

      product.reserveStock(10);
      product.deactivate();
      await repository.save(product);

      const found = await repository.findById(product.id);
      expect(found).not.toBeNull();
      expect(found!.reservedQuantity).toBe(10);
      expect(found!.status).toBe(ProductStatus.INACTIVE);
      expect(found!.stockQuantity).toBe(50);

      const all = await repository.findAll();
      expect(all).toHaveLength(1);
    });
  });

  describe('findById()', () => {
    it('should return the product when it exists', async () => {
      const product = Product.create(Sku.create('SKU-003'), 'Thingamajig', 25);
      await repository.save(product);

      const found = await repository.findById(product.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(product.id);
    });

    it('should return null when the product does not exist', async () => {
      const found = await repository.findById('non-existent-id');

      expect(found).toBeNull();
    });
  });

  describe('findBySku()', () => {
    it('should return the product when it exists', async () => {
      const product = Product.create(Sku.create('SKU-004'), 'Doohickey', 10);
      await repository.save(product);

      const found = await repository.findBySku('SKU-004');

      expect(found).not.toBeNull();
      expect(found!.sku.value).toBe('SKU-004');
      expect(found!.name).toBe('Doohickey');
    });

    it('should return null when no product matches the SKU', async () => {
      const found = await repository.findBySku('NON-EXISTENT-SKU');

      expect(found).toBeNull();
    });
  });

  describe('findAll()', () => {
    it('should return all persisted products', async () => {
      const p1 = Product.create(Sku.create('SKU-A'), 'Alpha', 5);
      const p2 = Product.create(Sku.create('SKU-B'), 'Beta', 15);
      const p3 = Product.create(Sku.create('SKU-C'), 'Gamma', 25);
      await repository.save(p1);
      await repository.save(p2);
      await repository.save(p3);

      const all = await repository.findAll();

      expect(all).toHaveLength(3);
      const skus = all.map((p) => p.sku.value).sort();
      expect(skus).toEqual(['SKU-A', 'SKU-B', 'SKU-C']);
    });

    it('should return an empty array when no products exist', async () => {
      const all = await repository.findAll();

      expect(all).toEqual([]);
    });
  });
});
