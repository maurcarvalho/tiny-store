/**
 * Exercise G2-3: Unstable Contract (Breaking DTO Changes)
 *
 * This shows a PlaceOrderDto that has been modified with breaking changes:
 * renaming fields, changing types, and removing fields that consumers
 * depend on. When a module's public API changes frequently, every consumer
 * must be updated in lockstep — the definition of high co-change coupling.
 *
 * WHY THIS VIOLATES G2:
 * - Contract Stability drops: the public DTO that consumers depend on
 *   changes without backward compatibility.
 * - Co-Change Frequency rises: every change to this DTO forces changes
 *   in the API routes, tests, and any module that creates orders.
 * - The module's API Boundary Ratio degrades over time as consumers
 *   stop trusting the contract and access internals instead.
 *
 * DETECTION:
 * - Contract Stability metric < 1.0 (compare exports between versions)
 * - Co-change analysis: if PlaceOrderDto changes, how many other files
 *   change in the same commit? (high = unstable contract)
 * - Git log: `git log --follow -p -- features/place-order/dto.ts`
 *
 * RESOLUTION: Treat DTOs as versioned contracts. Add new optional fields
 * instead of renaming/removing. If a breaking change is unavoidable,
 * create a v2 DTO alongside v1 with a deprecation period. Review all
 * DTO changes in PRs as contract changes, not implementation details.
 */

// ===== VERSION 1 (Original — Stable) =====
export interface PlaceOrderDtoV1 {
  customerId: string;
  items: Array<{
    sku: string;
    quantity: number;
    unitPrice: number;
  }>;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

// ===== VERSION 2 (Breaking Changes — VIOLATION) =====
export interface PlaceOrderDtoV2 {
  // ❌ VIOLATION: renamed field (customerId → userId)
  // Every consumer that sends { customerId: '...' } now breaks
  userId: string;

  // ❌ VIOLATION: changed nested structure
  // items[].unitPrice was number, now it's a string with currency
  items: Array<{
    sku: string;
    quantity: number;
    // ❌ was: unitPrice: number
    price: { amount: string; currency: string };
  }>;

  // ❌ VIOLATION: flattened nested object
  // was: shippingAddress: { street, city, state, postalCode, country }
  // now: individual fields at root level
  street: string;
  city: string;
  state: string;
  zip: string;     // ❌ renamed: postalCode → zip
  country: string;

  // ❌ VIOLATION: removed field entirely
  // shippingAddress was a cohesive object; now it's scattered
}

// ===== VERSION 3 (Correct Evolution — Non-Breaking) =====
export interface PlaceOrderDtoV3 {
  customerId: string;  // ✅ kept original name
  items: Array<{
    sku: string;
    quantity: number;
    unitPrice: number;  // ✅ kept original type
  }>;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  // ✅ CORRECT: new optional fields (non-breaking additions)
  priority?: 'standard' | 'express' | 'overnight';
  notes?: string;
  couponCode?: string;
}

/**
 * Impact of V2 (breaking change):
 *
 * Files that must change simultaneously:
 * 1. apps/api/src/app/api/orders/route.ts (request parsing)
 * 2. libs/modules/orders/src/features/place-order/handler.ts (validation)
 * 3. libs/modules/orders/src/features/place-order/service.ts (mapping)
 * 4. apps/api/e2e/comprehensive.e2e.spec.ts (test fixtures)
 * 5. Any external client consuming the API
 *
 * Co-change count: 5+ files for one DTO rename.
 * With V3 (additive change): 0 files must change — new fields are optional.
 *
 * Rule of thumb: if changing a DTO forces changes in >2 files,
 * the contract is unstable and the change should be additive instead.
 */
