import { ValueObject } from '@tiny-store/shared-domain';
import { ValidationError } from '@tiny-store/shared-domain';

interface TrackingNumberProps {
  value: string;
}

export class TrackingNumber extends ValueObject<TrackingNumberProps> {
  private constructor(props: TrackingNumberProps) {
    super(props);
  }

  static create(value: string): TrackingNumber {
    if (!value || value.trim().length === 0) {
      throw new ValidationError('Tracking number cannot be empty');
    }

    return new TrackingNumber({ value: value.trim().toUpperCase() });
  }

  static generate(): TrackingNumber {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const value = `TRK-${timestamp}-${random}`;
    
    return new TrackingNumber({ value });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.value;
  }
}

