import { ValueObject, ValidationError, Money } from '@tiny-store/shared-domain';

interface OrderItemProps {
  sku: string;
  quantity: number;
  unitPrice: Money;
}

export class OrderItem extends ValueObject<OrderItemProps> {
  private constructor(props: OrderItemProps) {
    super(props);
  }

  static create(sku: string, quantity: number, unitPrice: Money): OrderItem {
    if (!sku || sku.trim().length === 0) {
      throw new ValidationError('SKU cannot be empty');
    }

    if (quantity < 1) {
      throw new ValidationError('Quantity must be at least 1');
    }

    return new OrderItem({
      sku: sku.trim().toUpperCase(),
      quantity,
      unitPrice,
    });
  }

  get sku(): string {
    return this.props.sku;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get unitPrice(): Money {
    return this.props.unitPrice;
  }

  get totalPrice(): Money {
    return this.unitPrice.multiply(this.quantity);
  }
}

