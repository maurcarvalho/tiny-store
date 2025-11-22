export interface GetShipmentResponse {
  shipmentId: string;
  orderId: string;
  trackingNumber: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  status: string;
  dispatchedAt: Date | null;
  deliveredAt: Date | null;
  estimatedDeliveryDate: Date | null;
  isDelayed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

