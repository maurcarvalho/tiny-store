/**
 * Exercise G2-2: Circular Dependency Between Modules
 *
 * This shows a scenario where Orders imports from Inventory AND Inventory
 * imports from Orders, creating a circular dependency. In a modular
 * monolith, circular dependencies make it impossible to extract either
 * module independently and indicate tangled bounded contexts.
 *
 * WHY THIS VIOLATES G2:
 * - Co-Change Frequency rises: changes in either module ripple to the other,
 *   creating a change amplification effect.
 * - The dependency graph becomes a cycle instead of a DAG (directed acyclic
 *   graph). Nx detects this and refuses to build in strict mode.
 * - Incremental Maintainability Degradation: the more cycles exist, the
 *   harder it is to reason about impact of any single change.
 *
 * DETECTION:
 * - `nx graph` shows bidirectional edges between modules
 * - `nx lint` with enforce-module-boundaries (type:module → type:shared only)
 *   blocks this pattern at compile time
 * - Circular dependency count > 0
 *
 * RESOLUTION: Break the cycle by introducing an event. If Orders needs
 * stock info, it listens to InventoryReserved events instead of importing
 * from Inventory. If Inventory needs order status, it listens to
 * OrderPlaced/OrderCancelled events instead of importing from Orders.
 * The EventBus is the decoupling mechanism.
 */

// ===== FILE: libs/modules/orders/src/features/place-order/service.ts =====
// ❌ VIOLATION: Orders imports from Inventory
import type { DrizzleDb } from '@tiny-store/shared-infrastructure';

// This import creates edge: Orders → Inventory
import { ReserveStockHandler } from '@tiny-store/modules-inventory';

export class PlaceOrderServiceWithCycle {
  private reserveStockHandler: ReserveStockHandler;

  constructor(db: DrizzleDb) {
    // ❌ VIOLATION: direct instantiation of Inventory handler
    this.reserveStockHandler = new ReserveStockHandler(db);
  }

  async execute(orderId: string, sku: string, quantity: number): Promise<void> {
    // ❌ VIOLATION: synchronous call to Inventory from Orders
    await this.reserveStockHandler.handle({ orderId, sku, quantity });
  }
}

// ===== FILE: libs/modules/inventory/src/listeners/order-placed.listener.ts =====
// ❌ VIOLATION: Inventory imports from Orders (completing the cycle)

// This import creates edge: Inventory → Orders
// Combined with the above: Orders → Inventory → Orders = CYCLE
import { GetOrderHandler } from '@tiny-store/modules-orders';
import type { DomainEvent } from '@tiny-store/shared-infrastructure';

export class OrderPlacedListenerWithCycle {
  private getOrderHandler: GetOrderHandler;

  constructor(db: DrizzleDb) {
    // ❌ VIOLATION: Inventory instantiates an Orders handler
    this.getOrderHandler = new GetOrderHandler(db);
  }

  async handle(event: DomainEvent): Promise<void> {
    const payload = event.payload as { orderId: string };

    // ❌ VIOLATION: Inventory calls back into Orders to get order details
    // This is the return edge of the cycle: Inventory → Orders
    const order = await this.getOrderHandler.handle(payload.orderId);

    console.log(`Processing order ${order.id} for stock reservation`);
    // ... stock reservation logic
  }
}

/**
 * Dependency graph (broken):
 *
 *   Orders ──imports──▶ Inventory
 *      ▲                    │
 *      └────imports─────────┘
 *
 * Dependency graph (correct):
 *
 *   Orders ──event──▶ EventBus ──event──▶ Inventory
 *      ▲                                      │
 *      └──────────event──── EventBus ◀─event──┘
 *
 * With events, there is no compile-time dependency between modules.
 * Each module only depends on shared-infrastructure (where EventBus lives).
 */
