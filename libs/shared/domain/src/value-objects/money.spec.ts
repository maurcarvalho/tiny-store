import { Money } from './money.value-object';
import { ValidationError } from '../errors/domain.error';

describe('Money Value Object', () => {
  describe('Creation', () => {
    it('should create money with positive amount', () => {
      const money = Money.create(100);
      
      expect(money.amount).toBe(100);
      expect(money.currency).toBe('USD');
    });

    it('should create money with custom currency', () => {
      const money = Money.create(100, 'EUR');
      
      expect(money.amount).toBe(100);
      expect(money.currency).toBe('EUR');
    });

    it('should create money with zero amount', () => {
      const money = Money.create(0);
      
      expect(money.amount).toBe(0);
    });

    it('should throw error for negative amount', () => {
      expect(() => {
        Money.create(-10);
      }).toThrow(ValidationError);
      expect(() => {
        Money.create(-10);
      }).toThrow(/Amount cannot be negative/);
    });

    it('should throw error for invalid currency code', () => {
      expect(() => {
        Money.create(100, 'US');
      }).toThrow(ValidationError);
      
      expect(() => {
        Money.create(100, '');
      }).toThrow(ValidationError);
      
      expect(() => {
        Money.create(100, 'EURO');
      }).toThrow(ValidationError);
    });
  });

  describe('Addition', () => {
    it('should add two money amounts with same currency', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(50, 'USD');
      
      const result = money1.add(money2);
      
      expect(result.amount).toBe(150);
      expect(result.currency).toBe('USD');
    });

    it('should throw error when adding different currencies', () => {
      const usd = Money.create(100, 'USD');
      const eur = Money.create(50, 'EUR');
      
      expect(() => {
        usd.add(eur);
      }).toThrow(ValidationError);
      expect(() => {
        usd.add(eur);
      }).toThrow(/Cannot add money with different currencies/);
    });

    it('should handle adding zero', () => {
      const money = Money.create(100, 'USD');
      const zero = Money.create(0, 'USD');
      
      const result = money.add(zero);
      
      expect(result.amount).toBe(100);
    });

    it('should be commutative', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(50, 'USD');
      
      const result1 = money1.add(money2);
      const result2 = money2.add(money1);
      
      expect(result1.amount).toBe(result2.amount);
    });
  });

  describe('Subtraction', () => {
    it('should subtract two money amounts with same currency', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(30, 'USD');
      
      const result = money1.subtract(money2);
      
      expect(result.amount).toBe(70);
      expect(result.currency).toBe('USD');
    });

    it('should throw error when subtracting different currencies', () => {
      const usd = Money.create(100, 'USD');
      const eur = Money.create(50, 'EUR');
      
      expect(() => {
        usd.subtract(eur);
      }).toThrow(ValidationError);
    });

    it('should handle subtracting to zero', () => {
      const money = Money.create(100, 'USD');
      
      const result = money.subtract(money);
      
      expect(result.amount).toBe(0);
    });

    it('should throw error when result would be negative', () => {
      const money1 = Money.create(50, 'USD');
      const money2 = Money.create(100, 'USD');
      
      expect(() => {
        money1.subtract(money2);
      }).toThrow(ValidationError);
    });
  });

  describe('Multiplication', () => {
    it('should multiply money by positive factor', () => {
      const money = Money.create(100, 'USD');
      
      const result = money.multiply(3);
      
      expect(result.amount).toBe(300);
      expect(result.currency).toBe('USD');
    });

    it('should multiply by decimal factor', () => {
      const money = Money.create(100, 'USD');
      
      const result = money.multiply(1.5);
      
      expect(result.amount).toBe(150);
    });

    it('should multiply by zero', () => {
      const money = Money.create(100, 'USD');
      
      const result = money.multiply(0);
      
      expect(result.amount).toBe(0);
    });

    it('should throw error when multiplying by negative factor', () => {
      const money = Money.create(100, 'USD');
      
      expect(() => {
        money.multiply(-2);
      }).toThrow(ValidationError);
    });
  });

  describe('Comparison', () => {
    it('should correctly compare greater than', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(50, 'USD');
      
      expect(money1.isGreaterThan(money2)).toBe(true);
      expect(money2.isGreaterThan(money1)).toBe(false);
    });

    it('should correctly compare less than', () => {
      const money1 = Money.create(50, 'USD');
      const money2 = Money.create(100, 'USD');
      
      expect(money1.isLessThan(money2)).toBe(true);
      expect(money2.isLessThan(money1)).toBe(false);
    });

    it('should throw error when comparing different currencies', () => {
      const usd = Money.create(100, 'USD');
      const eur = Money.create(100, 'EUR');
      
      expect(() => {
        usd.isGreaterThan(eur);
      }).toThrow(ValidationError);
      
      expect(() => {
        usd.isLessThan(eur);
      }).toThrow(ValidationError);
    });

    it('should handle equal amounts', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(100, 'USD');
      
      expect(money1.isGreaterThan(money2)).toBe(false);
      expect(money1.isLessThan(money2)).toBe(false);
    });
  });

  describe('Equality', () => {
    it('should be equal for same amount and currency', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(100, 'USD');
      
      expect(money1.equals(money2)).toBe(true);
    });

    it('should not be equal for different amounts', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(50, 'USD');
      
      expect(money1.equals(money2)).toBe(false);
    });

    it('should not be equal for different currencies', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(100, 'EUR');
      
      expect(money1.equals(money2)).toBe(false);
    });

    it('should be reflexive', () => {
      const money = Money.create(100, 'USD');
      
      expect(money.equals(money)).toBe(true);
    });
  });

  describe('Immutability', () => {
    it('should not modify original money when adding', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(50, 'USD');
      
      money1.add(money2);
      
      expect(money1.amount).toBe(100);
      expect(money2.amount).toBe(50);
    });

    it('should not modify original money when subtracting', () => {
      const money1 = Money.create(100, 'USD');
      const money2 = Money.create(50, 'USD');
      
      money1.subtract(money2);
      
      expect(money1.amount).toBe(100);
      expect(money2.amount).toBe(50);
    });

    it('should not modify original money when multiplying', () => {
      const money = Money.create(100, 'USD');
      
      money.multiply(3);
      
      expect(money.amount).toBe(100);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should calculate order total', () => {
      const item1 = Money.create(29.99, 'USD');
      const item2 = Money.create(49.99, 'USD');
      const item3 = Money.create(19.99, 'USD');
      
      const total = item1.add(item2).add(item3);
      
      expect(total.amount).toBe(99.97);
    });

    it('should calculate line item total (price * quantity)', () => {
      const unitPrice = Money.create(29.99, 'USD');
      const quantity = 3;
      
      const lineTotal = unitPrice.multiply(quantity);
      
      expect(lineTotal.amount).toBe(89.97);
    });

    it('should calculate discount', () => {
      const price = Money.create(100, 'USD');
      const discount = Money.create(15, 'USD');
      
      const finalPrice = price.subtract(discount);
      
      expect(finalPrice.amount).toBe(85);
    });

    it('should calculate percentage discount', () => {
      const price = Money.create(100, 'USD');
      const discountRate = 0.20; // 20% off
      
      const discountAmount = price.multiply(discountRate);
      const finalPrice = price.subtract(discountAmount);
      
      expect(discountAmount.amount).toBe(20);
      expect(finalPrice.amount).toBe(80);
    });

    it('should compare prices for sorting', () => {
      const prices = [
        Money.create(50, 'USD'),
        Money.create(100, 'USD'),
        Money.create(25, 'USD'),
        Money.create(75, 'USD'),
      ];
      
      const sorted = prices.sort((a, b) => {
        if (a.isLessThan(b)) return -1;
        if (a.isGreaterThan(b)) return 1;
        return 0;
      });
      
      expect(sorted[0].amount).toBe(25);
      expect(sorted[1].amount).toBe(50);
      expect(sorted[2].amount).toBe(75);
      expect(sorted[3].amount).toBe(100);
    });
  });
});

