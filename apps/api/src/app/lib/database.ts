import 'reflect-metadata';
import { createDatabaseConnection } from '@tiny-store/shared-infrastructure';
import { DataSource } from 'typeorm';

let dataSource: DataSource | null = null;

export async function getDatabase(): Promise<DataSource> {
  if (!dataSource) {
    dataSource = await createDatabaseConnection();
    console.log('✅ Database connected');
  }
  
  return dataSource;
}

