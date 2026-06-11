import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { GetShipmentService } from './service';
import { GetShipmentResponse } from './dto';

export class GetShipmentHandler {
  private service: GetShipmentService;

  constructor(db: DrizzleDb) {
    this.service = new GetShipmentService(db);
  }

  async handle(shipmentId: string): Promise<GetShipmentResponse> {
    return await this.service.execute(shipmentId);
  }
}

