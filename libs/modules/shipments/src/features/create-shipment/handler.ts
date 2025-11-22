import { DataSource } from 'typeorm';
import { CreateShipmentService } from './service';
import { CreateShipmentDto, CreateShipmentResponse } from './dto';

export class CreateShipmentHandler {
  private service: CreateShipmentService;

  constructor(dataSource: DataSource) {
    this.service = new CreateShipmentService(dataSource);
  }

  async handle(dto: CreateShipmentDto): Promise<CreateShipmentResponse> {
    return await this.service.execute(dto);
  }
}

