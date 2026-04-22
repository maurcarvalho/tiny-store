export interface OrderInput {
  orderId: string;
  customerId: string;
  items: Array<{ sku: string; quantity: number; unitPrice: number }>;
  totalAmount: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface OrderFulfillmentResult {
  success: boolean;
  trackingNumber?: string;
  reason?: string;
}
