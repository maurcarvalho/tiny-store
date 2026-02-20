/**
 * Exercise 2: Shared Table Access (ω degradation)
 *
 * This would be added to the orders module, e.g.:
 *   libs/modules/orders/src/features/get-order/service.ts
 *
 * VIOLATION: The orders module executes a raw SQL query that directly reads
 * from the inventory module's 'products' table to show stock availability
 * alongside order details. This bypasses the event/ACL boundary and creates
 * a shared-data coupling between orders and inventory.
 *
 * WHY G1 PASSES: There is no import from @tiny-store/modules-inventory.
 * The query is raw SQL executed through the DataSource — no boundary test
 * detects cross-module table access.
 *
 * WHY G2 PASSES: No new module-level dependencies are introduced. The
 * maintainability metrics (ρ_api, fan-in, complexity) remain unchanged.
 *
 * WHAT G3 CATCHES: ω drops below 1.0 because the 'products' table is now
 * accessed by two modules (inventory owns it, orders reads it). If these
 * modules were extracted to separate services, they would need to share a
 * database or the query would break.
 *
 * Metric impact: ω ↓ (from 1.0 to 0.8, since 1 of 5 entities loses single ownership)
 *
 * FIX: Expose stock availability through an event (InventoryUpdated with
 * current stock levels) or a query handler in the inventory module, consumed
 * through the composition root.
 */

import { DataSource } from 'typeorm';

interface OrderWithStock {
  orderId: string;
  items: Array<{
    sku: string;
    quantity: number;
    availableStock: number; // ❌ comes from inventory's table
  }>;
}

export class GetOrderWithStockService {
  constructor(private dataSource: DataSource) {}

  async execute(orderId: string): Promise<OrderWithStock> {
    // First get the order (this is fine — orders module owns the 'orders' table)
    const orderRows = await this.dataSource.query(
      `SELECT * FROM orders WHERE id = $1`,
      [orderId]
    );

    if (orderRows.length === 0) {
      throw new Error(`Order ${orderId} not found`);
    }

    const order = orderRows[0];
    const items = JSON.parse(order.items);

    // ❌ VIOLATION: Direct SQL query to inventory's 'products' table
    // The orders module should NOT access inventory's data directly.
    const enrichedItems = await Promise.all(
      items.map(async (item: { sku: string; quantity: number }) => {
        const productRows = await this.dataSource.query(
          `SELECT "stockQuantity" FROM products WHERE sku = $1`,
          [item.sku]
        );
        return {
          sku: item.sku,
          quantity: item.quantity,
          availableStock: productRows[0]?.stockQuantity ?? 0, // ❌ cross-module data
        };
      })
    );

    return {
      orderId: order.id,
      items: enrichedItems,
    };
  }
}
