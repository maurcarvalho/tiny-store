/**
 * Mock Payment Processor
 * Simulates payment processing with 90% success rate
 */
export class PaymentProcessor {
  private successRate: number;

  constructor(successRate: number = 0.9) {
    this.successRate = successRate;
  }

  async processPayment(
    amount: number,
    paymentMethod: string
  ): Promise<{ success: boolean; transactionId?: string; errorMessage?: string }> {
    // Simulate processing time
    await this.delay(200);

    const random = Math.random();

    if (random < this.successRate) {
      return {
        success: true,
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      };
    } else {
      const errors = [
        'Insufficient funds',
        'Card declined',
        'Payment method expired',
        'Network error',
        'Bank rejected transaction',
      ];

      return {
        success: false,
        errorMessage: errors[Math.floor(Math.random() * errors.length)],
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

