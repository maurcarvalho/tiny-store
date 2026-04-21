/**
 * Exercise G1-2: Encapsulation Leakage (Exporting Internal Types)
 *
 * This shows a broken index.ts that exports internal implementation details
 * (entities, repositories, services) alongside the public API. This turns
 * private module internals into public contracts that other modules can
 * depend on, making refactoring dangerous.
 *
 * WHY THIS VIOLATES G1:
 * - Encapsulation Leakage metric increases: the module exposes types that
 *   should be hidden behind its boundary. Other modules can now import
 *   Order entity, OrderRepository, PlaceOrderService directly.
 * - The public API should only expose: Handlers, DTOs, Domain Events,
 *   and Listeners. Everything else is an implementation detail.
 * - Every leaked export becomes a contract: changing it requires checking
 *   all consumers across the monolith.
 *
 * DETECTION:
 * - Export count significantly higher than expected (e.g., 40+ vs 20)
 * - Encapsulation Leakage count > 0 (internal types appear in other
 *   modules' import statements)
 * - API Boundary Ratio drops below 1.0
 *
 * RESOLUTION: Remove internal exports from index.ts. Only expose handlers,
 * DTOs, events, and listeners. If another module needs data, it should
 * request it through the EventBus, not import the entity directly.
 */

// ===== CURRENT index.ts (CORRECT) =====
// Only public API is exported — handlers, DTOs, events, listeners

// ===== BROKEN index.ts (VIOLATION) =====

// Public API — Handlers (✅ correct to export)
export * from './features/place-order/handler';
export * from './features/cancel-order/handler';
export * from './features/get-order/handler';
export * from './features/list-orders/handler';

// Public API — DTOs (✅ correct to export)
export * from './features/place-order/dto';
export * from './features/cancel-order/dto';
export * from './features/get-order/dto';
export * from './features/list-orders/dto';

// Public API — Domain Events (✅ correct to export)
export * from './domain/events/order-placed.event';
export * from './domain/events/order-confirmed.event';
export * from './domain/events/order-rejected.event';
export * from './domain/events/order-paid.event';
export * from './domain/events/order-payment-failed.event';
export * from './domain/events/order-shipped.event';
export * from './domain/events/order-cancelled.event';

// Public API — Listeners (✅ correct to export)
export * from './listeners/inventory-reserved.listener';
export * from './listeners/inventory-reservation-failed.listener';
export * from './listeners/payment-processed.listener';
export * from './listeners/payment-failed.listener';
export * from './listeners/shipment-created.listener';

// ❌ VIOLATION: exporting domain entities
// Other modules can now do: import { Order } from '@tiny-store/modules-orders'
export * from './domain/entities/order';

// ❌ VIOLATION: exporting repository (implementation detail)
// Other modules can now instantiate OrderRepository and query Orders' DB
export * from './domain/repositories/order.repository';

// ❌ VIOLATION: exporting service (implementation detail)
// Other modules can now call PlaceOrderService directly, bypassing the handler
export * from './features/place-order/service';

// ❌ VIOLATION: exporting value objects (implementation detail)
// CustomerId and OrderItem are internal to the Orders bounded context
export * from './domain/value-objects/customer-id.value-object';
export * from './domain/value-objects/order-item.value-object';

// ❌ VIOLATION: exporting enums (implementation detail)
// OrderStatus is how Orders represents state internally; other modules
// should only see status as a string in DTOs/events
export * from './domain/enums/order-status.enum';

// ❌ VIOLATION: exporting DB schema (internal infrastructure)
// This is the worst leak — it gives other modules direct access to the
// Drizzle table definition, enabling cross-schema queries
export * from './db/schema';

/**
 * Impact: The correct Orders module exports 25 types.
 * This broken version exports 33 types (+8 leaked internals).
 *
 * With 8 internal types exposed, any of the other 3 modules (Inventory,
 * Payments, Shipments) can create hidden dependencies on Orders' internals.
 * When Orders needs to refactor its entity or repository, those hidden
 * consumers break silently.
 */
