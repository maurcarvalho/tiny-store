import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { ProcessPaymentService } from './service';
import { ProcessPaymentDto, ProcessPaymentResponse } from './dto';

export class ProcessPaymentHandler {
  private service: ProcessPaymentService;

  constructor(db: DrizzleDb) {
    this.service = new ProcessPaymentService(db);
  }

  async handle(dto: ProcessPaymentDto): Promise<ProcessPaymentResponse> {
    return await this.service.execute(dto);
  }
}

