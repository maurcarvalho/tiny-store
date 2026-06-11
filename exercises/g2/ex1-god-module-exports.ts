/**
 * Exercise G2-1: God Module (Export Bloat)
 *
 * This shows an Inventory module whose index.ts has grown to 45+ exports
 * because every internal helper, utility, and sub-feature was exposed over
 * time. This is the "God Module" anti-pattern: a module that tries to do
 * too much and exposes too much surface area.
 *
 * WHY THIS VIOLATES G2:
 * - Dependency Attraction rises: the more a module exports, the more other
 *   modules depend on it, making it the bottleneck of every change.
 * - API Boundary Ratio drops: the ratio of public-API-used-by-consumers vs
 *   total-exports decreases, meaning most exports are dead weight or
 *   internal details leaking out.
 * - Export Budget (the G2 mechanism) is exceeded: each module should have
 *   a reviewed, bounded number of exports. Inventory's real budget is ~17;
 *   this version has 45+.
 *
 * DETECTION:
 * - Export count per module (run: npx ts-node tools/metrics/g2-metrics.ts)
 * - API Boundary Ratio < 1.0
 * - Dependency Attraction: if many modules import from this one
 *
 * RESOLUTION: Audit every export. Split the module if it covers multiple
 * bounded contexts (e.g., "catalog" vs "stock"). Remove internal utilities
 * from index.ts. Target: ≤20 exports per module.
 */

// ===== CURRENT Inventory index.ts (CORRECT — 17 exports) =====
// 5 handlers + 5 DTOs + 3 events + 3 listeners + 1 job = 17

// ===== BLOATED Inventory index.ts (VIOLATION — 45+ exports) =====

// Public API — Handlers (✅)
export * from './features/create-product/handler';
export * from './features/get-product/handler';
export * from './features/reserve-stock/handler';
export * from './features/release-stock/handler';
export * from './features/update-product-stock/handler';

// Public API — DTOs (✅)
export * from './features/create-product/dto';
export * from './features/get-product/dto';
export * from './features/reserve-stock/dto';
export * from './features/release-stock/dto';
export * from './features/update-product-stock/dto';

// Public API — Domain Events (✅)
export * from './domain/events/inventory-reserved.event';
export * from './domain/events/inventory-reservation-failed.event';
export * from './domain/events/inventory-released.event';

// Public API — Listeners (✅)
export * from './listeners/order-placed.listener';
export * from './listeners/order-cancelled.listener';
export * from './listeners/order-payment-failed.listener';

// Public API — Jobs (✅)
export * from './jobs/stock-sync.job';

// ❌ VIOLATION: internal entities should not be in index.ts
export * from './domain/entities/product';
export * from './domain/entities/stock-reservation';

// ❌ VIOLATION: repositories are implementation details
export * from './domain/repositories/product.repository';
export * from './domain/repositories/stock-reservation.repository';

// ❌ VIOLATION: services are internal orchestration
export * from './features/create-product/service';
export * from './features/get-product/service';
export * from './features/reserve-stock/service';
export * from './features/release-stock/service';
export * from './features/update-product-stock/service';

// ❌ VIOLATION: value objects are bounded-context internals
export * from './domain/value-objects/sku.value-object';

// ❌ VIOLATION: enums are internal state representation
export * from './domain/enums/product-status.enum';

// ❌ VIOLATION: DB schema is infrastructure
export * from './db/schema';

// ❌ VIOLATION: internal.ts content duplicated in index.ts
export * from './internal';

// ❌ VIOLATION: ad-hoc utility functions that grew over time
// These don't even exist in the real codebase — they represent
// the typical "while I'm here, let me export this helper" pattern
// export * from './utils/stock-calculator';
// export * from './utils/sku-validator';
// export * from './utils/reservation-expiry';
// export * from './utils/product-mapper';

/**
 * Impact:
 * - Real Inventory module: 17 exports, focused public API
 * - This bloated version: 32 real exports + utility stubs = 45+
 * - Every new export is a new contract. Renaming Product.stockQuantity
 *   now requires checking every consumer across the monolith.
 * - The module becomes a "gravity well" that attracts dependencies
 *   from all other modules.
 */
