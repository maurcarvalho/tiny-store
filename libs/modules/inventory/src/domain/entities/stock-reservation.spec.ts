import { StockReservation } from './stock-reservation';

describe('StockReservation Entity', () => {
  describe('Creation', () => {
    it('should create valid stock reservation', () => {
      const createdAt = new Date();
      const reservation = new StockReservation(
        'reservation-123',
        'order-456',
        'SKU-001',
        10,
        createdAt,
        null,
        false
      );
      
      expect(reservation.id).toBe('reservation-123');
      expect(reservation.orderId).toBe('order-456');
      expect(reservation.sku).toBe('SKU-001');
      expect(reservation.quantity).toBe(10);
      expect(reservation.createdAt).toBe(createdAt);
      expect(reservation.expiresAt).toBeNull();
      expect(reservation.released).toBe(false);
    });

    it('should create reservation with expiry date', () => {
      const createdAt = new Date();
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour
      
      const reservation = new StockReservation(
        'reservation-123',
        'order-456',
        'SKU-001',
        10,
        createdAt,
        expiresAt,
        false
      );
      
      expect(reservation.expiresAt).toEqual(expiresAt);
      expect(reservation.isExpired()).toBe(false);
    });
  });

  describe('Expiry Checks', () => {
    it('should detect expired reservations', () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const reservation = new StockReservation(
        'reservation-123',
        'order-456',
        'SKU-001',
        10,
        new Date(),
        pastDate,
        false
      );
      
      expect(reservation.isExpired()).toBe(true);
    });

    it('should not expire when expiresAt is in future', () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const reservation = new StockReservation(
        'reservation-123',
        'order-456',
        'SKU-001',
        10,
        new Date(),
        futureDate,
        false
      );
      
      expect(reservation.isExpired()).toBe(false);
    });

    it('should handle no expiry date (never expires)', () => {
      const reservation = new StockReservation(
        'reservation-123',
        'order-456',
        'SKU-001',
        10,
        new Date(),
        null,
        false
      );
      
      expect(reservation.isExpired()).toBe(false);
    });
  });

  describe('Extension', () => {
    it('should extend reservation by hours', () => {
      const originalExpiry = new Date(Date.now() + 3600000); // 1 hour
      const reservation = new StockReservation(
        'reservation-123',
        'order-456',
        'SKU-001',
        10,
        new Date(),
        originalExpiry,
        false
      );
      
      const extended = reservation.extend(2); // Add 2 hours
      
      expect(extended.expiresAt).toBeDefined();
      expect(extended.expiresAt!.getTime()).toBeGreaterThan(originalExpiry.getTime());
      
      const expectedTime = originalExpiry.getTime() + (2 * 60 * 60 * 1000);
      expect(extended.expiresAt!.getTime()).toBe(expectedTime);
    });

    it('should create expiry when extending reservation without expiry', () => {
      const reservation = new StockReservation(
        'reservation-123',
        'order-456',
        'SKU-001',
        10,
        new Date(),
        null,
        false
      );
      
      const extended = reservation.extend(3); // 3 hours
      
      expect(extended.expiresAt).toBeDefined();
      expect(extended.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should preserve other properties when extending', () => {
      const reservation = new StockReservation(
        'reservation-123',
        'order-456',
        'SKU-001',
        10,
        new Date(),
        new Date(Date.now() + 3600000),
        false
      );
      
      const extended = reservation.extend(1);
      
      expect(extended.id).toBe('reservation-123');
      expect(extended.orderId).toBe('order-456');
      expect(extended.sku).toBe('SKU-001');
      expect(extended.quantity).toBe(10);
      expect(extended.released).toBe(false);
    });
  });

  describe('Release', () => {
    it('should mark reservation as released', () => {
      const reservation = new StockReservation(
        'reservation-123',
        'order-456',
        'SKU-001',
        10,
        new Date(),
        null,
        false
      );
      
      expect(reservation.released).toBe(false);
      
      reservation.release();
      
      expect(reservation.released).toBe(true);
    });

    it('should allow releasing already released reservation (idempotent)', () => {
      const reservation = new StockReservation(
        'reservation-123',
        'order-456',
        'SKU-001',
        10,
        new Date(),
        null,
        false
      );
      
      reservation.release();
      expect(reservation.released).toBe(true);
      
      // Release again
      reservation.release();
      expect(reservation.released).toBe(true);
    });
  });

  describe('Business Logic', () => {
    it('should create immutable reservation properties', () => {
      const reservation = new StockReservation(
        'reservation-123',
        'order-456',
        'SKU-001',
        10,
        new Date(),
        null,
        false
      );
      
      // These should be readonly
      expect(reservation.id).toBe('reservation-123');
      expect(reservation.orderId).toBe('order-456');
      expect(reservation.sku).toBe('SKU-001');
      expect(reservation.quantity).toBe(10);
    });

    it('should track reservation quantity accurately', () => {
      const smallReservation = new StockReservation(
        'res-1',
        'order-1',
        'SKU-001',
        1,
        new Date(),
        null,
        false
      );
      
      const largeReservation = new StockReservation(
        'res-2',
        'order-2',
        'SKU-002',
        1000,
        new Date(),
        null,
        false
      );
      
      expect(smallReservation.quantity).toBe(1);
      expect(largeReservation.quantity).toBe(1000);
    });
  });
});

