export interface CreateProductDto {
  sku: string;
  name: string;
  stockQuantity: number;
}

export interface CreateProductResponse {
  productId: string;
  sku: string;
  name: string;
  stockQuantity: number;
  availableStock: number;
}

