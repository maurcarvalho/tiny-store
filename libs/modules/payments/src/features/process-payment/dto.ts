export interface ProcessPaymentDto {
  orderId: string;
  amount: number;
}

export interface ProcessPaymentResponse {
  paymentId: string;
  status: string;
  success: boolean;
  errorMessage?: string;
}

