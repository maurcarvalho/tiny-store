import { AggregateRoot, BusinessRuleViolationError } from '@tiny-store/shared-domain';
import { Sku } from '../value-objects/sku.value-object';
import { ProductStatus } from '../enums/product-status.enum';
import { v4 as uuidv4 } from 'uuid';

export class Product extends AggregateRoot {
  private constructor(
    id: string,
    public readonly sku: Sku,
    public name: string,
    public stockQuantity: number,
    public reservedQuantity: number,
    public status: ProductStatus,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {
    super(id);
  }

  static create(sku: Sku, name: string, initialStock: number): Product {
    if (initialStock < 0) {
      throw new BusinessRuleViolationError('Initial stock cannot be negative');
    }

    const now = new Date();
    return new Product(
      uuidv4(),
      sku,
      name,
      initialStock,
      0,
      ProductStatus.ACTIVE,
      now,
      now
    );
  }

  static reconstitute(
    id: string,
    sku: Sku,
    name: string,
    stockQuantity: number,
    reservedQuantity: number,
    status: ProductStatus,
    createdAt: Date,
    updatedAt: Date
  ): Product {
    return new Product(
      id,
      sku,
      name,
      stockQuantity,
      reservedQuantity,
      status,
      createdAt,
      updatedAt
    );
  }

  get availableStock(): number {
    return this.stockQuantity - this.reservedQuantity;
  }

  canReserve(quantity: number): boolean {
    return (
      this.status === ProductStatus.ACTIVE &&
      quantity > 0 &&
      this.availableStock >= quantity
    );
  }

  reserveStock(quantity: number): void {
    if (!this.canReserve(quantity)) {
      throw new BusinessRuleViolationError(
        `Cannot reserve ${quantity} units. Available: ${this.availableStock}`
      );
    }

    this.reservedQuantity += quantity;
    this.updatedAt = new Date();
  }

  releaseStock(quantity: number): void {
    if (quantity <= 0) {
      throw new BusinessRuleViolationError('Release quantity must be positive');
    }

    if (quantity > this.reservedQuantity) {
      throw new BusinessRuleViolationError(
        `Cannot release ${quantity} units. Reserved: ${this.reservedQuantity}`
      );
    }

    this.reservedQuantity -= quantity;
    this.updatedAt = new Date();
  }

  adjustStock(newQuantity: number): void {
    if (newQuantity < 0) {
      throw new BusinessRuleViolationError('Stock quantity cannot be negative');
    }

    if (newQuantity < this.reservedQuantity) {
      throw new BusinessRuleViolationError(
        `Cannot set stock below reserved quantity (${this.reservedQuantity})`
      );
    }

    this.stockQuantity = newQuantity;
    this.updatedAt = new Date();
  }

  isAvailable(): boolean {
    return this.status === ProductStatus.ACTIVE && this.availableStock > 0;
  }

  activate(): void {
    this.status = ProductStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.status = ProductStatus.INACTIVE;
    this.updatedAt = new Date();
  }
}

