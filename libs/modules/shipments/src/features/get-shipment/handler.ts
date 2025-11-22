import { DataSource } from 'typeorm';
import { GetShipmentService } from './service';
import { GetShipmentResponse } from './dto';

export class GetShipmentHandler {
  private service: GetShipmentService;

  constructor(dataSource: DataSource) {
    this.service = new GetShipmentService(dataSource);
  }

  async handle(shipmentId: string): Promise<GetShipmentResponse> {
    return await this.service.execute(shipmentId);
  }
}

