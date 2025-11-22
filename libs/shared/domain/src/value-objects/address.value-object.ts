import { ValueObject } from '../base/value-object.base';
import { ValidationError } from '../errors/domain.error';

interface AddressProps {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export class Address extends ValueObject<AddressProps> {
  private constructor(props: AddressProps) {
    super(props);
  }

  static create(
    street: string,
    city: string,
    state: string,
    postalCode: string,
    country: string
  ): Address {
    if (!street || street.trim().length === 0) {
      throw new ValidationError('Street is required');
    }
    
    if (!city || city.trim().length === 0) {
      throw new ValidationError('City is required');
    }
    
    if (!state || state.trim().length === 0) {
      throw new ValidationError('State is required');
    }
    
    if (!postalCode || postalCode.trim().length === 0) {
      throw new ValidationError('Postal code is required');
    }
    
    if (!country || country.trim().length === 0) {
      throw new ValidationError('Country is required');
    }

    return new Address({
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      country: country.trim(),
    });
  }

  get street(): string {
    return this.props.street;
  }

  get city(): string {
    return this.props.city;
  }

  get state(): string {
    return this.props.state;
  }

  get postalCode(): string {
    return this.props.postalCode;
  }

  get country(): string {
    return this.props.country;
  }

  toString(): string {
    return `${this.street}, ${this.city}, ${this.state} ${this.postalCode}, ${this.country}`;
  }
}

