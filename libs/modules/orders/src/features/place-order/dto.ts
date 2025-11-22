export interface PlaceOrderDto {
  customerId: string;
  items: Array<{ sku: string; quantity: number; unitPrice: number }>;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface PlaceOrderResponse {
  orderId: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
}

