export class StockReservation {
  constructor(
    public readonly id: string,
    public readonly orderId: string,
    public readonly sku: string,
    public readonly quantity: number,
    public readonly createdAt: Date,
    public readonly expiresAt: Date | null = null,
    public released: boolean = false
  ) {}

  isExpired(): boolean {
    if (!this.expiresAt) {
      return false;
    }
    
    return new Date() > this.expiresAt;
  }

  extend(hours: number): StockReservation {
    const newExpiresAt = this.expiresAt
      ? new Date(this.expiresAt.getTime() + hours * 60 * 60 * 1000)
      : new Date(Date.now() + hours * 60 * 60 * 1000);

    return new StockReservation(
      this.id,
      this.orderId,
      this.sku,
      this.quantity,
      this.createdAt,
      newExpiresAt,
      this.released
    );
  }

  release(): void {
    this.released = true;
  }
}

