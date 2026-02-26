import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { GetPaymentService } from './service';
import { GetPaymentResponse } from './dto';

export class GetPaymentHandler {
  private service: GetPaymentService;

  constructor(db: DrizzleDb) {
    this.service = new GetPaymentService(db);
  }

  async handle(paymentId: string): Promise<GetPaymentResponse> {
    return await this.service.execute(paymentId);
  }
}

