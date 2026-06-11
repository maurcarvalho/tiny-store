import { eq } from 'drizzle-orm';
import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { stockReservationsTable } from '../../db/schema';
import { StockReservation } from '../entities/stock-reservation';
import { v4 as uuidv4 } from 'uuid';

export class StockReservationRepository {
  constructor(private db: DrizzleDb) {}

  async save(reservation: StockReservation): Promise<void> {
    await this.db.insert(stockReservationsTable).values({
      id: reservation.id,
      orderId: reservation.orderId,
      sku: reservation.sku,
      quantity: reservation.quantity,
      createdAt: reservation.createdAt,
      expiresAt: reservation.expiresAt ?? undefined,
      released: reservation.released,
    }).onConflictDoUpdate({
      target: stockReservationsTable.id,
      set: {
        orderId: reservation.orderId,
        sku: reservation.sku,
        quantity: reservation.quantity,
        expiresAt: reservation.expiresAt ?? undefined,
        released: reservation.released,
      },
    });
  }

  async create(
    orderId: string,
    sku: string,
    quantity: number
  ): Promise<string> {
    const reservation = new StockReservation(
      uuidv4(),
      orderId,
      sku,
      quantity,
      new Date(),
      null,
      false
    );

    await this.save(reservation);
    return reservation.id;
  }

  async findById(id: string): Promise<StockReservation | null> {
    const rows = await this.db.select().from(stockReservationsTable).where(eq(stockReservationsTable.id, id));
    return rows.length > 0 ? this.toDomain(rows[0]) : null;
  }

  async findByOrderId(orderId: string): Promise<StockReservation[]> {
    const rows = await this.db.select().from(stockReservationsTable).where(eq(stockReservationsTable.orderId, orderId));
    return rows.map((row) => this.toDomain(row));
  }

  async findBySku(sku: string): Promise<StockReservation[]> {
    const rows = await this.db.select().from(stockReservationsTable).where(eq(stockReservationsTable.sku, sku));
    return rows.map((row) => this.toDomain(row));
  }

  async releaseByOrderId(orderId: string): Promise<void> {
    await this.db.update(stockReservationsTable)
      .set({ released: true })
      .where(eq(stockReservationsTable.orderId, orderId));
  }

  private toDomain(row: typeof stockReservationsTable.$inferSelect): StockReservation {
    return new StockReservation(
      row.id,
      row.orderId,
      row.sku,
      row.quantity,
      row.createdAt,
      row.expiresAt ?? null,
      row.released
    );
  }
}
