import { DataSource } from 'typeorm';
import { GetPaymentService } from './service';
import { GetPaymentResponse } from './dto';

export class GetPaymentHandler {
  private service: GetPaymentService;

  constructor(dataSource: DataSource) {
    this.service = new GetPaymentService(dataSource);
  }

  async handle(paymentId: string): Promise<GetPaymentResponse> {
    return await this.service.execute(paymentId);
  }
}

