/**
 * Exercise G3-2: Shared Data / Cross-Schema Query
 *
 * This is a modified version showing raw SQL that queries another module's
 * database schema directly instead of going through events or public APIs.
 *
 * WHY THIS VIOLATES G3:
 * - G1 (Guidelines) passes: the query returns correct data
 * - G2 (Boundaries) passes: no TypeScript import of another module
 * - G3 (Scalability) FAILS: data ownership drops — the Orders module reads
 *   directly from `inventory.products`, bypassing the Inventory module's
 *   public API. When Inventory is extracted to its own database, this raw
 *   SQL query will break because the `inventory` schema no longer exists
 *   in the Orders database.
 *
 * FIX: Use the Inventory module's public API (GetProductHandler) or cache
 * stock data via events (e.g., listen to InventoryReserved/Released events
 * and maintain a local read model).
 */

import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { sql } from 'drizzle-orm';

interface OrderValidationResult {
  orderId: string;
  hasStock: boolean;
}

/**
 * This service directly queries the inventory schema from within the
 * orders module — a G3 violation that breaks data ownership.
 */
export class OrderValidationServiceWithSharedData {
  constructor(private db: DrizzleDb) {}

  async validateStock(orderId: string, sku: string, quantity: number): Promise<OrderValidationResult> {
    // VIOLATION: raw SQL reading from another module's schema
    const result = await this.db.execute(
      sql`SELECT stock_quantity FROM inventory.products WHERE sku = ${sku}`
    );

    const row = (result as unknown as Array<{ stock_quantity: number }>)[0];
    const stockQuantity = row?.stock_quantity ?? 0;

    return {
      orderId,
      hasStock: stockQuantity >= quantity,
    };
  }
}
