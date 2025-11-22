export interface ReserveStockDto {
  orderId: string;
  items: Array<{ sku: string; quantity: number }>;
}

export interface ReserveStockResponse {
  success: boolean;
  orderId: string;
  reservations?: Array<{ sku: string; quantity: number }>;
  error?: string;
}

