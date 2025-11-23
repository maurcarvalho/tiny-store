# AI Agent Guidelines for Tiny Store

This document provides guidelines for AI agents interacting with the Tiny Store Nx monorepo.

## Workspace Structure

Tiny Store is a modular monolith built with Nx, implementing Domain-Driven Design and event-driven architecture.

### Project Organization

- **Apps**: `apps/api` - Next.js API application
- **Libraries**: `libs/modules/*` - Domain modules (Orders, Inventory, Payments, Shipments)
- **Shared**: `libs/shared/*` - Shared domain and infrastructure code

### Key Modules

1. **Orders Module** (`libs/modules/orders`)
   - Manages order lifecycle with state machine
   - Features: place-order, cancel-order, get-order, list-orders
   - Events: OrderPlaced, OrderCancelled, OrderConfirmed, etc.

2. **Inventory Module** (`libs/modules/inventory`)
   - Manages product stock and reservations
   - Features: create-product, reserve-stock, release-stock, get-product
   - Events: StockReserved, StockReleased, ReservationFailed

3. **Payments Module** (`libs/modules/payments`)
   - Handles payment processing
   - Features: process-payment, get-payment
   - Events: PaymentProcessed, PaymentFailed

4. **Shipments Module** (`libs/modules/shipments`)
   - Manages shipment creation and tracking
   - Features: create-shipment, get-shipment
   - Events: ShipmentCreated

### Architecture Principles

1. **Domain-Driven Design**: Each module is a bounded context with its own domain entities, value objects, and repositories
2. **Event-Driven**: Modules communicate via domain events through the event bus
3. **Clean Architecture**: Clear separation between domain, application, and infrastructure layers
4. **Feature-Based Organization**: Features are organized by use case (e.g., `place-order/`, `cancel-order/`)

### Development Guidelines

- **Testing**: Each module has comprehensive unit tests. Use `nx test <project>` to run tests
- **E2E Tests**: Located in `apps/api/e2e/` - test complete workflows
- **Code Generation**: Use Nx generators (`nx g`) to create new features or modules
- **Linting**: Run `nx lint` to check code quality
- **Type Safety**: Strict TypeScript configuration - maintain type safety across modules

### Common Commands

- `nx serve api` - Start the development server
- `nx test <project>` - Run tests for a specific project
- `nx run-many --target=test --all` - Run all tests
- `nx build api` - Build the API application
- `nx graph` - Visualize project dependencies

### Important Files

- `nx.json` - Nx workspace configuration
- `tsconfig.base.json` - Base TypeScript configuration
- `docs/ARCHITECTURE.md` - Detailed architecture documentation
- `docs/EVENT_FLOWS.md` - Event flow documentation
- `docs/TESTING.md` - Testing guidelines

### When Making Changes

1. **New Features**: Create feature folders following the existing pattern (handler, request, response)
2. **New Events**: Add event classes in the domain/events folder and register listeners
3. **Cross-Module Changes**: Be aware of module boundaries - use events for communication
4. **Database Changes**: Update entities and migrations as needed
5. **Tests**: Always add/update tests when making changes

### Module Boundaries

Respect module boundaries:
- Each module should only depend on shared libraries, not other domain modules
- Use events for inter-module communication
- Keep domain logic within the appropriate module

