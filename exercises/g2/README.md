# G2 Exercises — Incremental Maintainability

These exercises demonstrate anti-patterns that violate **G2: Preserve Incremental Maintainability**.

Each file shows "broken" code with `❌ VIOLATION` markers and explains:
- **Why** it violates G2
- **How to detect** it (which metric signals the problem)
- **How to fix** it (the resolution)

## Exercises

| # | File | Anti-Pattern | Detection |
|---|------|-------------|-----------|
| 1 | `ex1-god-module-exports.ts` | Module with 45+ exports (export bloat) | Export count exceeds budget, API Boundary Ratio < 1.0 |
| 2 | `ex2-circular-dependency.ts` | Bidirectional imports between modules | `nx graph` shows cycle, lint fails |
| 3 | `ex3-unstable-contract.ts` | Breaking DTO changes without backward compatibility | Contract Stability < 1.0, Co-Change Frequency rises |

## Key Principle

> Each module's public API is a **contract**. Keep exports bounded, dependencies acyclic, and contracts stable. Degradation is incremental — measure it continuously.

## Running Detection

```bash
# Export counts and API boundary ratio
npx ts-node tools/metrics/g2-metrics.ts

# Circular dependency detection
npx nx graph

# Boundary enforcement
npx nx run-many --target=lint --all
```
