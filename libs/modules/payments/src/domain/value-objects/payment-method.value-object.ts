import { ValueObject } from '@tiny-store/shared-domain';
import { ValidationError } from '@tiny-store/shared-domain';

enum PaymentMethodType {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

interface PaymentMethodProps {
  type: PaymentMethodType;
  details: string;
}

export class PaymentMethod extends ValueObject<PaymentMethodProps> {
  private constructor(props: PaymentMethodProps) {
    super(props);
  }

  static createCreditCard(last4Digits: string): PaymentMethod {
    if (!last4Digits || last4Digits.length !== 4) {
      throw new ValidationError('Last 4 digits must be exactly 4 characters');
    }

    return new PaymentMethod({
      type: PaymentMethodType.CREDIT_CARD,
      details: `****${last4Digits}`,
    });
  }

  static createDefault(): PaymentMethod {
    return new PaymentMethod({
      type: PaymentMethodType.CREDIT_CARD,
      details: '****1234',
    });
  }

  get type(): string {
    return this.props.type;
  }

  get details(): string {
    return this.props.details;
  }

  toString(): string {
    return `${this.type}: ${this.details}`;
  }
}

