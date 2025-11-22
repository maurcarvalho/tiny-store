export interface GetPaymentResponse {
  paymentId: string;
  orderId: string;
  amount: number;
  status: string;
  paymentMethod: {
    type: string;
    details: string;
  };
  failureReason?: string;
  processingAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}

