import { DataSource } from 'typeorm';
import { ProductEntity, StockReservationEntity } from '@tiny-store/modules-inventory/internal';
import { OrderEntity } from '@tiny-store/modules-orders/internal';
import { PaymentEntity } from '@tiny-store/modules-payments/internal';
import { ShipmentEntity } from '@tiny-store/modules-shipments/internal';
import { EventStoreEntity } from '../event-store/event-store.entity';

export const createDatabaseConnection = async (): Promise<DataSource> => {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['DB_PORT'] || '5432'),
    username: process.env['DB_USER'] || 'tinystore',
    password: process.env['DB_PASSWORD'] || 'tinystore',
    database: process.env['DB_NAME'] || 'tinystore',
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

