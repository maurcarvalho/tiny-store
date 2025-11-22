export interface GetOrderResponse {
  orderId: string;
  customerId: string;
  items: Array<{ sku: string; quantity: number; unitPrice: number; totalPrice: number }>;
  totalAmount: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  status: string;
  paymentId?: string;
  shipmentId?: string;
  cancellationReason?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

