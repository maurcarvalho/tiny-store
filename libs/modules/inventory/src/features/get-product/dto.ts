export interface GetProductResponse {
  productId: string;
  sku: string;
  name: string;
  stockQuantity: number;
  reservedQuantity: number;
  availableStock: number;
  status: string;
}

