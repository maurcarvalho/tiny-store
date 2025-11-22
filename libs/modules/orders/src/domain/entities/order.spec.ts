import { Order } from './order';
import { OrderStatus } from '../enums/order-status.enum';
import { CustomerId } from '../value-objects/customer-id.value-object';
import { OrderItem } from '../value-objects/order-item.value-object';
import { Address, Money, BusinessRuleViolationError } from '@tiny-store/shared-domain';

describe('Order Domain Entity', () => {
  const createValidOrder = (): Order => {
    const customerId = CustomerId.create('customer-123');
    const items = [
      OrderItem.create('WIDGET-001', 2, Money.create(29.99)),
      OrderItem.create('GADGET-002', 1, Money.create(49.99)),
    ];
    const address = Address.create('123 Main St', 'San Francisco', 'CA', '94102', 'USA');
    
    return Order.create(customerId, items, address);
  };

  describe('Order Creation', () => {
    it('should create an order with PENDING status', () => {
      const order = createValidOrder();
      
      expect(order).toBeDefined();
      expect(order.id).toBeDefined();
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.items.length).toBe(2);
    });

    it('should throw error when creating order with no items', () => {
      const customerId = CustomerId.create('customer-123');
      const address = Address.create('123 Main St', 'San Francisco', 'CA', '94102', 'USA');
      
      expect(() => {
        Order.create(customerId, [], address);
      }).toThrow(BusinessRuleViolationError);
    });

    it('should calculate total correctly', () => {
      const order = createValidOrder();
      const total = order.calculateTotal();
      
      // (2 * 29.99) + (1 * 49.99) = 109.97
      expect(total.amount).toBe(109.97);
    });
  });

  describe('Order Confirmation', () => {
    it('should confirm a pending order', () => {
      const order = createValidOrder();
      
      order.confirm();
      
      expect(order.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should throw error when confirming non-pending order', () => {
      const order = createValidOrder();
      order.confirm();
      
      expect(() => {
        order.confirm();
      }).toThrow(BusinessRuleViolationError);
      expect(() => {
        order.confirm();
      }).toThrow(/Cannot confirm order in CONFIRMED status/);
    });
  });

  describe('Order Rejection', () => {
    it('should reject a pending order with reason', () => {
      const order = createValidOrder();
      const reason = 'Insufficient stock';
      
      order.reject(reason);
      
      expect(order.status).toBe(OrderStatus.REJECTED);
      expect(order.rejectionReason).toBe(reason);
    });

    it('should throw error when rejecting non-pending order', () => {
      const order = createValidOrder();
      order.confirm();
      
      expect(() => {
        order.reject('Some reason');
      }).toThrow(BusinessRuleViolationError);
    });
  });

  describe('Payment Processing', () => {
    it('should mark confirmed order as paid', () => {
      const order = createValidOrder();
      order.confirm();
      
      order.markAsPaid('payment-123');
      
      expect(order.status).toBe(OrderStatus.PAID);
      expect(order.paymentId).toBe('payment-123');
    });

    it('should throw error when marking non-confirmed order as paid', () => {
      const order = createValidOrder();
      
      expect(() => {
        order.markAsPaid('payment-123');
      }).toThrow(BusinessRuleViolationError);
    });

    it('should mark confirmed order as payment failed', () => {
      const order = createValidOrder();
      order.confirm();
      
      order.markPaymentFailed('Card declined');
      
      expect(order.status).toBe(OrderStatus.PAYMENT_FAILED);
    });
  });

  describe('Order Shipment', () => {
    it('should mark paid order as shipped', () => {
      const order = createValidOrder();
      order.confirm();
      order.markAsPaid('payment-123');
      
      order.markAsShipped('shipment-456');
      
      expect(order.status).toBe(OrderStatus.SHIPPED);
      expect(order.shipmentId).toBe('shipment-456');
    });

    it('should throw error when marking non-paid order as shipped', () => {
      const order = createValidOrder();
      order.confirm();
      
      expect(() => {
        order.markAsShipped('shipment-456');
      }).toThrow(BusinessRuleViolationError);
    });
  });

  describe('Order Cancellation', () => {
    it('should cancel a pending order', () => {
      const order = createValidOrder();
      const reason = 'Customer changed mind';
      
      order.cancel(reason);
      
      expect(order.status).toBe(OrderStatus.CANCELLED);
      expect(order.cancellationReason).toBe(reason);
    });

    it('should cancel a confirmed order', () => {
      const order = createValidOrder();
      order.confirm();
      
      order.cancel('Customer changed mind');
      
      expect(order.status).toBe(OrderStatus.CANCELLED);
    });

    it('should cancel a paid order', () => {
      const order = createValidOrder();
      order.confirm();
      order.markAsPaid('payment-123');
      
      order.cancel('Customer changed mind');
      
      expect(order.status).toBe(OrderStatus.CANCELLED);
    });

    it('should throw error when cancelling a shipped order', () => {
      const order = createValidOrder();
      order.confirm();
      order.markAsPaid('payment-123');
      order.markAsShipped('shipment-456');
      
      expect(() => {
        order.cancel('Too late');
      }).toThrow(BusinessRuleViolationError);
    });

    it('should throw error when cancelling a rejected order', () => {
      const order = createValidOrder();
      order.reject('Insufficient stock');
      
      expect(() => {
        order.cancel('Cannot cancel');
      }).toThrow(BusinessRuleViolationError);
    });
  });

  describe('Order State Checks', () => {
    it('should correctly identify pending order', () => {
      const order = createValidOrder();
      
      expect(order.isPending()).toBe(true);
      expect(order.isConfirmed()).toBe(false);
      expect(order.isPaid()).toBe(false);
      expect(order.isShipped()).toBe(false);
    });

    it('should correctly identify confirmed order', () => {
      const order = createValidOrder();
      order.confirm();
      
      expect(order.isPending()).toBe(false);
      expect(order.isConfirmed()).toBe(true);
      expect(order.isPaid()).toBe(false);
    });

    it('should correctly identify paid order', () => {
      const order = createValidOrder();
      order.confirm();
      order.markAsPaid('payment-123');
      
      expect(order.isPaid()).toBe(true);
      expect(order.isShipped()).toBe(false);
    });
  });

  describe('canBeCancelled', () => {
    it('should return true for pending order', () => {
      const order = createValidOrder();
      
      expect(order.canBeCancelled()).toBe(true);
    });

    it('should return true for confirmed order', () => {
      const order = createValidOrder();
      order.confirm();
      
      expect(order.canBeCancelled()).toBe(true);
    });

    it('should return true for paid order', () => {
      const order = createValidOrder();
      order.confirm();
      order.markAsPaid('payment-123');
      
      expect(order.canBeCancelled()).toBe(true);
    });

    it('should return false for shipped order', () => {
      const order = createValidOrder();
      order.confirm();
      order.markAsPaid('payment-123');
      order.markAsShipped('shipment-456');
      
      expect(order.canBeCancelled()).toBe(false);
    });

    it('should return false for rejected order', () => {
      const order = createValidOrder();
      order.reject('Insufficient stock');
      
      expect(order.canBeCancelled()).toBe(false);
    });

    it('should return false for cancelled order', () => {
      const order = createValidOrder();
      order.cancel('Customer changed mind');
      
      expect(order.canBeCancelled()).toBe(false);
    });
  });

  describe('Order State Machine', () => {
    it('should follow happy path: PENDING → CONFIRMED → PAID → SHIPPED', () => {
      const order = createValidOrder();
      expect(order.status).toBe(OrderStatus.PENDING);
      
      order.confirm();
      expect(order.status).toBe(OrderStatus.CONFIRMED);
      
      order.markAsPaid('payment-123');
      expect(order.status).toBe(OrderStatus.PAID);
      
      order.markAsShipped('shipment-456');
      expect(order.status).toBe(OrderStatus.SHIPPED);
    });

    it('should follow rejection path: PENDING → REJECTED', () => {
      const order = createValidOrder();
      expect(order.status).toBe(OrderStatus.PENDING);
      
      order.reject('Insufficient stock');
      expect(order.status).toBe(OrderStatus.REJECTED);
    });

    it('should follow payment failure path: PENDING → CONFIRMED → PAYMENT_FAILED', () => {
      const order = createValidOrder();
      expect(order.status).toBe(OrderStatus.PENDING);
      
      order.confirm();
      expect(order.status).toBe(OrderStatus.CONFIRMED);
      
      order.markPaymentFailed('Card declined');
      expect(order.status).toBe(OrderStatus.PAYMENT_FAILED);
    });

    it('should follow cancellation path from CONFIRMED', () => {
      const order = createValidOrder();
      order.confirm();
      
      order.cancel('Customer changed mind');
      expect(order.status).toBe(OrderStatus.CANCELLED);
    });
  });
});

