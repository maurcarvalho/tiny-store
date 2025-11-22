import { ValueObject } from '@tiny-store/shared-domain';
import { ValidationError } from '@tiny-store/shared-domain';

interface CustomerIdProps {
  value: string;
}

export class CustomerId extends ValueObject<CustomerIdProps> {
  private constructor(props: CustomerIdProps) {
    super(props);
  }

  static create(value: string): CustomerId {
    if (!value || value.trim().length === 0) {
      throw new ValidationError('Customer ID cannot be empty');
    }

    return new CustomerId({ value: value.trim() });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.value;
  }
}

