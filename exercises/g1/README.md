# G1 Exercises — Module Boundaries

These exercises demonstrate anti-patterns that violate **G1: Establish and Enforce Module Boundaries**.

Each file shows "broken" code with `❌ VIOLATION` markers and explains:
- **Why** it violates G1
- **How to detect** it (which metric signals the problem)
- **How to fix** it (the resolution)

## Exercises

| # | File | Anti-Pattern | Detection |
|---|------|-------------|-----------|
| 1 | `ex1-cross-module-import.ts` | Direct import from another module's internals | `nx lint` boundary violation, Undeclared Dependencies > 0 |
| 2 | `ex2-leaking-internal-types.ts` | Exporting entities/repos/services from index.ts | Export count exceeds budget, Encapsulation Leakage > 0 |
| 3 | `ex3-bypassing-event-contract.ts` | Calling another module's service directly | Forbidden Dependencies > 0, Event Violations > 0 |

## Key Principle

> Modules communicate **only** through the EventBus. The `index.ts` defines the public API — everything else is an implementation detail.

## Running Detection

```bash
# Boundary violations (catches ex1, ex3)
npx nx run-many --target=lint --all

# Export count analysis (catches ex2)
npx ts-node tools/metrics/g2-metrics.ts
```
