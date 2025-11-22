export interface CreateShipmentDto {
  orderId: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface CreateShipmentResponse {
  shipmentId: string;
  orderId: string;
  trackingNumber: string;
  status: string;
  estimatedDeliveryDate: Date | null;
}

