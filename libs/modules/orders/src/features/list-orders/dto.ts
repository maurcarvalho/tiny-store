export interface ListOrdersQuery {
  customerId?: string;
  status?: string;
}

export interface ListOrdersResponse {
  orders: Array<{
    orderId: string;
    customerId: string;
    totalAmount: number;
    status: string;
    createdAt: Date;
  }>;
}

