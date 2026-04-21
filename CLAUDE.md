# Tiny Store — Claude Code Context

Tiny Store is a **modular monolith** reference implementation built with **Nx**, **TypeScript**, **Drizzle ORM**, and **Next.js**. It serves as the practical companion to a master's thesis on progressive scalability for modular monolith applications.

## Architecture

```
apps/
  api/                    # Next.js API app (routes, middleware, listener registration)
  orders-service/         # Standalone extracted service (L3 extraction example)
libs/
  modules/
    {module}/             # Business modules (inventory, orders, payments, shipments)
  shared/
    domain/               # Shared value objects (Money, Address)
    infrastructure/       # EventBus, DB config, CacheService, QueueService, EventStore
    testing/              # Test helpers, PGlite setup, boundary specs
tools/
  metrics/                # Thesis metric scripts (extraction-readiness, g2-metrics)
exercises/
  g3/                     # Thesis G3 exercise files
```

## Module Structure

Every module follows this layout. **New modules MUST follow the same structure:**

```
libs/modules/{module}/
  src/
    db/
      schema.ts              # Drizzle schema with pgSchema('{module}')
    domain/
      entities/              # Domain entities + specs
      enums/                 # Status enums
      events/                # Domain events (published via EventBus)
      repositories/          # Drizzle repositories + specs
      value-objects/          # Value objects
    features/
      {feature}/
        dto.ts               # Input/output DTOs
        handler.ts           # HTTP handler (route handler)
        service.ts           # Business logic (orchestrates repo + events)
    jobs/                    # Background jobs + specs
    listeners/               # Event listeners (react to other modules' events)
    index.ts                 # PUBLIC API — only these exports are visible to other modules
    internal.ts              # Internal exports (schema tables for shared-infrastructure)
  .eslintrc.json             # ESLint config extending root
  jest.config.js             # Jest config
  project.json               # Nx project config with tags
  tsconfig.json              # TypeScript config
  tsconfig.spec.json         # TypeScript config for tests
```

## Key Rules

### Module Boundaries (STRICT)
- **Modules CANNOT import from other modules directly.** All cross-module communication goes through the EventBus (publish/subscribe).
- Modules can only import from `shared/*` libraries.
- The `api` app can import from modules and shared.
- ESLint `@nx/enforce-module-boundaries` enforces this at lint time.
- Boundary tags: `type:module`, `type:shared`, `type:app` (defined in `project.json`).

### Public API (`index.ts`)
- Every module has an `index.ts` that defines its public API.
- Only handlers, DTOs, domain events, listeners, and jobs are exported.
- **Entities, repositories, services, and schemas are NEVER exported** from `index.ts`.
- The `internal.ts` file exports Drizzle schema tables only — used exclusively by `shared-infrastructure` for migrations/setup.

### Schema Isolation (Drizzle ORM)
- Each module gets its own PostgreSQL schema: `pgSchema('{module}')`.
- Schema files live at `libs/modules/{module}/src/db/schema.ts`.
- The `event_store` table uses the public schema (`pgTable`, not `pgSchema`).
- **No module reads or writes to another module's schema.**

### Repository Pattern
- Every entity has a repository in `domain/repositories/`.
- Repositories receive `DrizzleDb` via constructor injection.
- Use `onConflictDoUpdate` for upserts.
- Type: `DrizzleDb` = `PostgresJsDatabase` from `drizzle-orm/postgres-js`.

### Event-Driven Communication
- `EventBus` (in `shared-infrastructure`) is the only way modules talk to each other.
- Events are defined in `domain/events/` and exported via `index.ts`.
- Listeners are in `listeners/` and react to events from other modules.
- All listener registration is centralized in `apps/api/src/app/lib/register-listeners.ts` using `MODULE_REGISTRY`.

### Testing
- **PGlite** (`@electric-sql/pglite`) for repository tests — in-process PostgreSQL, no Docker needed.
- Test helper: `createTestDb()` / `closeTestDb()` from `@tiny-store/shared-testing`.
- Entity/value-object tests are pure unit tests (no DB).
- Job tests mock repositories and EventBus.
- Every repository MUST have a spec file.
- Run all tests: `npx nx run-many --target=test --all`

### L3 Extraction
- `EXTRACTED_MODULES` env var controls which modules run as standalone services.
- Extraction middleware returns `410 Gone` for extracted module routes.
- `MODULE_REGISTRY` in `register-listeners.ts` handles conditional listener registration.
- Extraction is a config change, not a code change.

## Creating a New Module

When creating a new module (e.g., `notifications`):

1. **Create the directory structure** following the layout above.

2. **Create `db/schema.ts`** with its own `pgSchema`:
   ```ts
   import { pgSchema, text, timestamp } from 'drizzle-orm/pg-core';
   const notificationsSchema = pgSchema('notifications');
   export const notificationsTable = notificationsSchema.table('notifications', { ... });
   ```

3. **Create `index.ts`** exporting ONLY public API (handlers, DTOs, events, listeners).

4. **Create `internal.ts`** exporting schema tables:
   ```ts
   export { notificationsTable } from './db/schema';
   ```

5. **Register path aliases** in `tsconfig.base.json`:
   ```json
   "@tiny-store/modules-notifications": ["libs/modules/notifications/src/index.ts"],
   "@tiny-store/modules-notifications/internal": ["libs/modules/notifications/src/internal.ts"]
   ```

6. **Create `project.json`** with tags `["type:module", "scope:notifications"]`.

7. **Create `.eslintrc.json`** extending `../../../.eslintrc.json`.

8. **Create `jest.config.js`** and `tsconfig.spec.json`.

9. **Add DDL** for the new schema to `shared-infrastructure/database/database.config.ts` and to `shared-testing/pglite-test-db.ts`.

10. **Add MODULE_REGISTRY entry** in `apps/api/src/app/lib/register-listeners.ts`.

11. **Write repository specs** using PGlite (import `createTestDb`/`closeTestDb`).

12. **Run verification:**
    ```bash
    npx nx run-many --target=test --all
    npx nx run-many --target=lint --all
    ```

## NPM Scripts

| Script | Purpose |
|--------|---------|
| `test:scalability` | Run extraction-readiness checks for all modules |
| `test:guidelines` | Run boundary + scalability checks |
| `lint:boundaries` | Run ESLint boundary enforcement across all projects |

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Next.js (API routes)
- **ORM:** Drizzle ORM with `postgres-js` driver
- **Build:** Nx monorepo with `@nx/js` and `@nx/eslint`
- **Testing:** Jest + PGlite (in-process PostgreSQL)
- **DB:** PostgreSQL with per-module schema isolation
- **Events:** Custom EventBus (in-memory, synchronous)
- **Containers:** Docker + docker-compose (for deployment, not for tests)

## Do NOT

- Import between modules (use EventBus)
- Export entities/repositories/services from `index.ts`
- Use TypeORM or DataSource (migrated to Drizzle)
- Create cross-schema joins or foreign keys
- Add `search_path` manipulation
- Use `require()` — use static imports only
- Force push to `main`
