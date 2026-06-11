# G3 Exercises — Progressive Scalability

These exercises demonstrate anti-patterns that violate **G3: Enable Progressive Scalability**.

Each file shows "broken" code with `❌ VIOLATION` markers and explains:
- **Why** it violates G3
- **How to detect** it (which metric signals the problem)
- **How to fix** it (the resolution)

## Exercises

| # | File | Anti-Pattern | Detection |
|---|------|-------------|-----------|
| 1 | `ex1-sync-payment-check.ts` | Synchronous cross-module call at runtime | Sync Coupling Ratio rises, extraction-readiness gate fails |
| 2 | `ex2-shared-inventory-view.ts` | Cross-schema SQL query (reading another module's tables) | Data Ownership violation, schema isolation broken |
| 3 | `ex3-direct-redis-import.ts` | Direct infrastructure import bypassing abstraction | Abstraction Coverage drops, extraction blocked |

## Key Principle

> A module is extraction-ready when it can become a standalone service through **configuration change, not code change**. Every sync dependency, shared table, and direct infrastructure import is an extraction blocker.

## Running Detection

```bash
# Extraction readiness (binary gate: 0 or 1)
npx ts-node tools/metrics/extraction-readiness.ts --module orders

# All modules at once
npm run test:scalability

# Full guideline check (boundaries + scalability)
npm run test:guidelines
```
