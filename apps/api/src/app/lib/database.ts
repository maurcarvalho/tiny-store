import { createDatabaseConnection, closeDatabaseConnection } from '@tiny-store/shared-infrastructure';
import type { DrizzleDb } from '@tiny-store/shared-infrastructure';

let db: DrizzleDb | null = null;

export async function getDatabase(): Promise<DrizzleDb> {
  if (!db) {
    db = await createDatabaseConnection();
    console.log('Database connected');
  }

  return db;
}
