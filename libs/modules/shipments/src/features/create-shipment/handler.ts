import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { CreateShipmentService } from './service';
import { CreateShipmentDto, CreateShipmentResponse } from './dto';

export class CreateShipmentHandler {
  private service: CreateShipmentService;

  constructor(db: DrizzleDb) {
    this.service = new CreateShipmentService(db);
  }

  async handle(dto: CreateShipmentDto): Promise<CreateShipmentResponse> {
    return await this.service.execute(dto);
  }
}

