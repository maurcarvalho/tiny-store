import { ValueObject } from '@tiny-store/shared-domain';
import { ValidationError } from '@tiny-store/shared-domain';

interface SkuProps {
  value: string;
}

export class Sku extends ValueObject<SkuProps> {
  private constructor(props: SkuProps) {
    super(props);
  }

  static create(value: string): Sku {
    if (!value || value.trim().length === 0) {
      throw new ValidationError('SKU cannot be empty');
    }
    
    if (value.trim().length > 50) {
      throw new ValidationError('SKU cannot exceed 50 characters');
    }

    return new Sku({ value: value.trim().toUpperCase() });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.value;
  }
}

