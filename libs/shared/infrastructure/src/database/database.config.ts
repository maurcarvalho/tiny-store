import { DataSource } from 'typeorm';
import * as path from 'path';
import { ProductEntity, StockReservationEntity } from '@tiny-store/modules-inventory';
import { OrderEntity } from '@tiny-store/modules-orders';
import { PaymentEntity } from '@tiny-store/modules-payments';
import { ShipmentEntity } from '@tiny-store/modules-shipments';
import { EventStoreEntity } from '../event-store/event-store.entity';

export const createDatabaseConnection = async (): Promise<DataSource> => {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: path.join(process.cwd(), 'tiny-store.db'),
    entities: [
      ProductEntity,
      StockReservationEntity,
      OrderEntity,
      PaymentEntity,
      ShipmentEntity,
      EventStoreEntity,
    ],
    synchronize: true,
    logging: false,
  });

  await dataSource.initialize();
  return dataSource;
};

