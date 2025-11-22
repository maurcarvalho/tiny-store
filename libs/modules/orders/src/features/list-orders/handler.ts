import { DataSource } from 'typeorm';
import { ListOrdersService } from './service';
import { ListOrdersQuery, ListOrdersResponse } from './dto';

export class ListOrdersHandler {
  private service: ListOrdersService;

  constructor(dataSource: DataSource) {
    this.service = new ListOrdersService(dataSource);
  }

  async handle(query: ListOrdersQuery): Promise<ListOrdersResponse> {
    return await this.service.execute(query);
  }
}

