export interface ReleaseStockDto {
  orderId: string;
}

export interface ReleaseStockResponse {
  success: boolean;
  orderId: string;
  releasedReservations: Array<{ sku: string; quantity: number }>;
}

