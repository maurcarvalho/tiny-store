import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { ListOrdersService } from './service';
import { ListOrdersQuery, ListOrdersResponse } from './dto';

export class ListOrdersHandler {
  private service: ListOrdersService;

  constructor(db: DrizzleDb) {
    this.service = new ListOrdersService(db);
  }

  async handle(query: ListOrdersQuery): Promise<ListOrdersResponse> {
    return await this.service.execute(query);
  }
}

