export interface UpdateProductStockDto {
  sku: string;
  stockQuantity: number;
}

export interface UpdateProductStockResponse {
  productId: string;
  sku: string;
  name: string;
  stockQuantity: number;
  availableStock: number;
  reservedQuantity: number;
  status: string;
}
