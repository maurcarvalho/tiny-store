import 'reflect-metadata';
import { createDatabaseConnection, createAllModuleSchemas } from '@tiny-store/shared-infrastructure';
import { DataSource } from 'typeorm';

let dataSource: DataSource | null = null;

export async function getDatabase(): Promise<DataSource> {
  if (!dataSource) {
    dataSource = await createDatabaseConnection();
    await createAllModuleSchemas(dataSource);
    console.log('✅ Database connected (module schemas created)');
  }
  
  return dataSource;
}

