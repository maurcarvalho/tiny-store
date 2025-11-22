import { DataSource } from 'typeorm';
import { ProcessPaymentService } from './service';
import { ProcessPaymentDto, ProcessPaymentResponse } from './dto';

export class ProcessPaymentHandler {
  private service: ProcessPaymentService;

  constructor(dataSource: DataSource) {
    this.service = new ProcessPaymentService(dataSource);
  }

  async handle(dto: ProcessPaymentDto): Promise<ProcessPaymentResponse> {
    return await this.service.execute(dto);
  }
}

