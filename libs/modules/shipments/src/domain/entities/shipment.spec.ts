import { Address, BusinessRuleViolationError } from '@tiny-store/shared-domain';
import { Shipment } from './shipment';
import { ShipmentStatus } from '../enums/shipment-status.enum';

describe('Shipment Domain Entity', () => {
  const createValidShipment = (): Shipment => {
    const address = Address.create('123 Main St', 'San Francisco', 'CA', '94102', 'USA');
    return Shipment.create('order-123', address);
  };

  describe('Shipment Creation', () => {
    it('should create a shipment with PENDING status', () => {
      const shipment = createValidShipment();

      expect(shipment).toBeDefined();
      expect(shipment.id).toBeDefined();
      expect(shipment.status).toBe(ShipmentStatus.PENDING);
    });

    it('should set the correct order ID', () => {
      const shipment = createValidShipment();

      expect(shipment.orderId).toBe('order-123');
    });

    it('should generate a tracking number', () => {
      const shipment = createValidShipment();

      expect(shipment.trackingNumber).toBeDefined();
    });

    it('should set an estimated delivery date', () => {
      const shipment = createValidShipment();

      expect(shipment.estimatedDeliveryDate).toBeDefined();
      expect(shipment.estimatedDeliveryDate).toBeInstanceOf(Date);
    });

    it('should initialize with null dispatchedAt', () => {
      const shipment = createValidShipment();

      expect(shipment.dispatchedAt).toBeNull();
    });

    it('should initialize with null deliveredAt', () => {
      const shipment = createValidShipment();

      expect(shipment.deliveredAt).toBeNull();
    });
  });

  describe('Dispatch', () => {
    it('should dispatch from PENDING and set IN_TRANSIT', () => {
      const shipment = createValidShipment();

      shipment.dispatch();

      expect(shipment.status).toBe(ShipmentStatus.IN_TRANSIT);
    });

    it('should set dispatchedAt when dispatched', () => {
      const shipment = createValidShipment();

      shipment.dispatch();

      expect(shipment.dispatchedAt).toBeDefined();
      expect(shipment.dispatchedAt).toBeInstanceOf(Date);
    });

    it('should throw error when dispatching from IN_TRANSIT', () => {
      const shipment = createValidShipment();
      shipment.dispatch();

      expect(() => {
        shipment.dispatch();
      }).toThrow(BusinessRuleViolationError);
    });

    it('should throw error when dispatching from DELIVERED', () => {
      const shipment = createValidShipment();
      shipment.dispatch();
      shipment.markAsDelivered();

      expect(() => {
        shipment.dispatch();
      }).toThrow(BusinessRuleViolationError);
    });
  });

  describe('Delivery', () => {
    it('should mark as delivered from IN_TRANSIT', () => {
      const shipment = createValidShipment();
      shipment.dispatch();

      shipment.markAsDelivered();

      expect(shipment.status).toBe(ShipmentStatus.DELIVERED);
    });

    it('should set deliveredAt when delivered', () => {
      const shipment = createValidShipment();
      shipment.dispatch();

      shipment.markAsDelivered();

      expect(shipment.deliveredAt).toBeDefined();
      expect(shipment.deliveredAt).toBeInstanceOf(Date);
    });

    it('should throw error when marking delivered from PENDING', () => {
      const shipment = createValidShipment();

      expect(() => {
        shipment.markAsDelivered();
      }).toThrow(BusinessRuleViolationError);
    });

    it('should throw error when marking delivered from DELIVERED', () => {
      const shipment = createValidShipment();
      shipment.dispatch();
      shipment.markAsDelivered();

      expect(() => {
        shipment.markAsDelivered();
      }).toThrow(BusinessRuleViolationError);
    });
  });

  describe('State Checks', () => {
    it('canBeDispatched should return true for PENDING', () => {
      const shipment = createValidShipment();

      expect(shipment.canBeDispatched()).toBe(true);
    });

    it('canBeDispatched should return false for IN_TRANSIT', () => {
      const shipment = createValidShipment();
      shipment.dispatch();

      expect(shipment.canBeDispatched()).toBe(false);
    });

    it('canBeDispatched should return false for DELIVERED', () => {
      const shipment = createValidShipment();
      shipment.dispatch();
      shipment.markAsDelivered();

      expect(shipment.canBeDispatched()).toBe(false);
    });
  });

  describe('Delay Detection', () => {
    it('should report delayed when past estimated date and not delivered', () => {
      const shipment = createValidShipment();
      // Set estimated delivery date to the past
      (shipment as any).estimatedDeliveryDate = new Date('2020-01-01');

      expect(shipment.isDelayed()).toBe(true);
    });

    it('should not report delayed when delivered', () => {
      const shipment = createValidShipment();
      (shipment as any).estimatedDeliveryDate = new Date('2020-01-01');
      shipment.dispatch();
      shipment.markAsDelivered();

      expect(shipment.isDelayed()).toBe(false);
    });

    it('should not report delayed when before estimated date', () => {
      const shipment = createValidShipment();
      // Estimated date is already in the future from create()

      expect(shipment.isDelayed()).toBe(false);
    });
  });

  describe('Shipment State Machine', () => {
    it('should follow happy path: PENDING → IN_TRANSIT → DELIVERED', () => {
      const shipment = createValidShipment();
      expect(shipment.status).toBe(ShipmentStatus.PENDING);

      shipment.dispatch();
      expect(shipment.status).toBe(ShipmentStatus.IN_TRANSIT);

      shipment.markAsDelivered();
      expect(shipment.status).toBe(ShipmentStatus.DELIVERED);
    });
  });
});
