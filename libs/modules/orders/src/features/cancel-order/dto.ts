export interface CancelOrderDto {
  orderId: string;
  reason: string;
}

export interface CancelOrderResponse {
  orderId: string;
  status: string;
}

