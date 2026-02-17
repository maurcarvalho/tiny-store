import { DataSource } from 'typeorm';
import * as path from 'path';
import { ProductEntity, StockReservationEntity } from '@tiny-store/modules-inventory/internal';
import { OrderEntity } from '@tiny-store/modules-orders/internal';
import { PaymentEntity } from '@tiny-store/modules-payments/internal';
import { ShipmentEntity } from '@tiny-store/modules-shipments/internal';
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

