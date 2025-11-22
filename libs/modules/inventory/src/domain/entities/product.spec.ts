import { Product } from './product';
import { Sku } from '../value-objects/sku.value-object';
import { ProductStatus } from '../enums/product-status.enum';
import { BusinessRuleViolationError } from '@tiny-store/shared-domain';

describe('Product Domain Entity', () => {
  const createValidProduct = (stockQuantity = 100): Product => {
    const sku = Sku.create('WIDGET-001');
    return Product.create(sku, 'Super Widget', stockQuantity);
  };

  describe('Product Creation', () => {
    it('should create a product with initial stock', () => {
      const product = createValidProduct(100);
      
      expect(product).toBeDefined();
      expect(product.id).toBeDefined();
      expect(product.name).toBe('Super Widget');
      expect(product.stockQuantity).toBe(100);
      expect(product.reservedQuantity).toBe(0);
      expect(product.status).toBe(ProductStatus.ACTIVE);
    });

    it('should throw error when creating product with negative stock', () => {
      const sku = Sku.create('WIDGET-001');
      
      expect(() => {
        Product.create(sku, 'Super Widget', -10);
      }).toThrow(BusinessRuleViolationError);
    });

    it('should allow creating product with zero stock', () => {
      const product = createValidProduct(0);
      
      expect(product.stockQuantity).toBe(0);
      expect(product.availableStock).toBe(0);
    });
  });

  describe('Available Stock Calculation', () => {
    it('should calculate available stock correctly', () => {
      const product = createValidProduct(100);
      
      expect(product.availableStock).toBe(100);
      
      product.reserveStock(30);
      expect(product.availableStock).toBe(70);
      
      product.reserveStock(20);
      expect(product.availableStock).toBe(50);
    });

    it('should have zero available stock when all is reserved', () => {
      const product = createValidProduct(100);
      
      product.reserveStock(100);
      
      expect(product.availableStock).toBe(0);
      expect(product.stockQuantity).toBe(100);
      expect(product.reservedQuantity).toBe(100);
    });
  });

  describe('Stock Reservation', () => {
    it('should reserve stock successfully', () => {
      const product = createValidProduct(100);
      
      product.reserveStock(30);
      
      expect(product.reservedQuantity).toBe(30);
      expect(product.availableStock).toBe(70);
    });

    it('should throw error when reserving more than available', () => {
      const product = createValidProduct(100);
      
      expect(() => {
        product.reserveStock(101);
      }).toThrow(BusinessRuleViolationError);
      expect(() => {
        product.reserveStock(101);
      }).toThrow(/Cannot reserve 101 units/);
    });

    it('should throw error when reserving zero or negative quantity', () => {
      const product = createValidProduct(100);
      
      expect(() => {
        product.reserveStock(0);
      }).toThrow(BusinessRuleViolationError);
      
      expect(() => {
        product.reserveStock(-5);
      }).toThrow(BusinessRuleViolationError);
    });

    it('should throw error when reserving from inactive product', () => {
      const product = createValidProduct(100);
      product.deactivate();
      
      expect(() => {
        product.reserveStock(10);
      }).toThrow(BusinessRuleViolationError);
    });

    it('should allow multiple reservations', () => {
      const product = createValidProduct(100);
      
      product.reserveStock(20);
      product.reserveStock(30);
      product.reserveStock(10);
      
      expect(product.reservedQuantity).toBe(60);
      expect(product.availableStock).toBe(40);
    });
  });

  describe('Stock Release', () => {
    it('should release reserved stock successfully', () => {
      const product = createValidProduct(100);
      product.reserveStock(50);
      
      product.releaseStock(30);
      
      expect(product.reservedQuantity).toBe(20);
      expect(product.availableStock).toBe(80);
    });

    it('should throw error when releasing more than reserved', () => {
      const product = createValidProduct(100);
      product.reserveStock(50);
      
      expect(() => {
        product.releaseStock(60);
      }).toThrow(BusinessRuleViolationError);
      expect(() => {
        product.releaseStock(60);
      }).toThrow(/Cannot release 60 units/);
    });

    it('should throw error when releasing zero or negative quantity', () => {
      const product = createValidProduct(100);
      product.reserveStock(50);
      
      expect(() => {
        product.releaseStock(0);
      }).toThrow(BusinessRuleViolationError);
      
      expect(() => {
        product.releaseStock(-5);
      }).toThrow(BusinessRuleViolationError);
    });

    it('should release all reserved stock', () => {
      const product = createValidProduct(100);
      product.reserveStock(50);
      
      product.releaseStock(50);
      
      expect(product.reservedQuantity).toBe(0);
      expect(product.availableStock).toBe(100);
    });
  });

  describe('Stock Adjustment', () => {
    it('should adjust total stock quantity', () => {
      const product = createValidProduct(100);
      
      product.adjustStock(150);
      
      expect(product.stockQuantity).toBe(150);
      expect(product.availableStock).toBe(150);
    });

    it('should throw error when adjusting stock below reserved quantity', () => {
      const product = createValidProduct(100);
      product.reserveStock(60);
      
      expect(() => {
        product.adjustStock(50);
      }).toThrow(BusinessRuleViolationError);
      expect(() => {
        product.adjustStock(50);
      }).toThrow(/Cannot set stock below reserved quantity/);
    });

    it('should throw error when adjusting to negative stock', () => {
      const product = createValidProduct(100);
      
      expect(() => {
        product.adjustStock(-10);
      }).toThrow(BusinessRuleViolationError);
    });

    it('should allow adjusting to exact reserved quantity', () => {
      const product = createValidProduct(100);
      product.reserveStock(60);
      
      product.adjustStock(60);
      
      expect(product.stockQuantity).toBe(60);
      expect(product.availableStock).toBe(0);
    });
  });

  describe('canReserve', () => {
    it('should return true when sufficient stock available', () => {
      const product = createValidProduct(100);
      
      expect(product.canReserve(50)).toBe(true);
      expect(product.canReserve(100)).toBe(true);
    });

    it('should return false when insufficient stock', () => {
      const product = createValidProduct(100);
      
      expect(product.canReserve(101)).toBe(false);
    });

    it('should return false for zero or negative quantity', () => {
      const product = createValidProduct(100);
      
      expect(product.canReserve(0)).toBe(false);
      expect(product.canReserve(-5)).toBe(false);
    });

    it('should return false when product is inactive', () => {
      const product = createValidProduct(100);
      product.deactivate();
      
      expect(product.canReserve(10)).toBe(false);
    });

    it('should account for existing reservations', () => {
      const product = createValidProduct(100);
      product.reserveStock(60);
      
      expect(product.canReserve(40)).toBe(true);
      expect(product.canReserve(41)).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('should return true for active product with stock', () => {
      const product = createValidProduct(100);
      
      expect(product.isAvailable()).toBe(true);
    });

    it('should return false when all stock is reserved', () => {
      const product = createValidProduct(100);
      product.reserveStock(100);
      
      expect(product.isAvailable()).toBe(false);
    });

    it('should return false when product is inactive', () => {
      const product = createValidProduct(100);
      product.deactivate();
      
      expect(product.isAvailable()).toBe(false);
    });

    it('should return false for product with zero stock', () => {
      const product = createValidProduct(0);
      
      expect(product.isAvailable()).toBe(false);
    });
  });

  describe('Product Status', () => {
    it('should activate product', () => {
      const product = createValidProduct(100);
      product.deactivate();
      
      product.activate();
      
      expect(product.status).toBe(ProductStatus.ACTIVE);
    });

    it('should deactivate product', () => {
      const product = createValidProduct(100);
      
      product.deactivate();
      
      expect(product.status).toBe(ProductStatus.INACTIVE);
    });

    it('should prevent reservation when deactivated', () => {
      const product = createValidProduct(100);
      product.deactivate();
      
      expect(product.canReserve(10)).toBe(false);
    });

    it('should allow reservation after reactivation', () => {
      const product = createValidProduct(100);
      product.deactivate();
      product.activate();
      
      expect(product.canReserve(10)).toBe(true);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle reserve-release cycle correctly', () => {
      const product = createValidProduct(100);
      
      // Reserve for order 1
      product.reserveStock(30);
      expect(product.availableStock).toBe(70);
      
      // Reserve for order 2
      product.reserveStock(20);
      expect(product.availableStock).toBe(50);
      
      // Order 1 cancelled - release stock
      product.releaseStock(30);
      expect(product.availableStock).toBe(80);
      
      // Order 2 completes - stock is permanently reduced (in real system)
      // Here we just show the reservation still exists
      expect(product.reservedQuantity).toBe(20);
    });

    it('should handle stock replenishment', () => {
      const product = createValidProduct(10);
      product.reserveStock(8);
      
      // Stock arrives - increase inventory
      product.adjustStock(110);
      
      expect(product.stockQuantity).toBe(110);
      expect(product.reservedQuantity).toBe(8);
      expect(product.availableStock).toBe(102);
    });

    it('should prevent overselling', () => {
      const product = createValidProduct(100);
      
      product.reserveStock(60);
      product.reserveStock(40);
      
      // No more stock available
      expect(product.availableStock).toBe(0);
      expect(product.canReserve(1)).toBe(false);
      expect(() => {
        product.reserveStock(1);
      }).toThrow(BusinessRuleViolationError);
    });
  });
});

