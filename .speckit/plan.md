# Implementation Plan: Order Lifecycle Management System

**Version:** 1.0  
**Created:** 2025-11-22  
**Status:** Ready for Implementation

---

## 1. Overview

Implement the Order Lifecycle Management System as a modular monolith with event-driven architecture, following all constitutional principles.

---

## 2. Directory Structure

```
tiny-store/
│
├── apps/api/                                   # Next.js API (thin HTTP layer)
│   └── src/
│       ├── app/api/                            # Route handlers
│       │   ├── orders/                         # #package-by-feature
│       │   ├── inventory/
│       │   └── events/                         # #event-store
│       └── lib/                                # Bootstrapping
│           ├── database.ts                     # TypeORM + SQLite
│           ├── event-bus.ts                    # Singleton dispatcher
│           └── register-listeners.ts           # Wire event handlers
│
├── libs/modules/                               # Bounded contexts
│   ├── orders/                                 
│   │   └── src/
│   │       ├── domain/                         # #rich-entity
│   │       │   ├── entities/
│   │       │   ├── value-objects/
│   │       │   ├── enums/                      # #state-machine
│   │       │   ├── repositories/
│   │       │   └── events/                     # #domain-events
│   │       ├── features/                       # #vertical-slice
│   │       │   └── [feature]/
│   │       │       ├── handler.ts              # Thin API adapter
│   │       │       ├── service.ts              # Thin orchestration
│   │       │       └── dto.ts
│   │       ├── listeners/                      # #event-driven
│   │       └── __tests__/
│   ├── inventory/
│   ├── payments/
│   └── shipments/
│
└── libs/shared/                                # Cross-cutting
    ├── infrastructure/                         # Event bus, database, event store
    └── domain/                                 # Base classes, value objects, Result<T>
```

---

## 3. Implementation Tasks

### Phase 1: Foundation

**Task 1.1 - Initialize Workspace**
```bash
npx create-nx-workspace@latest tiny-store --preset=ts
```
- Configure TypeScript strict mode
- Set up ESLint
- Install dependencies: nx, next, typescript, typeorm, reflect-metadata, sqlite3, uuid

**Task 1.2 - Shared Infrastructure**
```bash
nx g @nx/js:library shared-infrastructure --directory=libs/shared/infrastructure
```
Create:
- `event-bus/event-bus.ts` - In-memory pub/sub with `publish()` and `subscribe()`
- `event-bus/domain-event.interface.ts` - Base event interface
- `database/database.config.ts` - TypeORM + SQLite configuration
- `database/base.repository.ts` - Base repository class
- `event-store/event-store.entity.ts` - Append-only event log (TypeORM entity)
- `event-store/event-store.repository.ts` - Event persistence

**Task 1.3 - Shared Domain**
```bash
nx g @nx/js:library shared-domain --directory=libs/shared/domain
```
Create:
- `base/entity.base.ts` - Base entity with ID
- `base/value-object.base.ts` - Immutable base
- `base/aggregate-root.base.ts` - Event emitter
- `value-objects/money.value-object.ts` - Amount + currency
- `value-objects/address.value-object.ts` - Shipping address
- `errors/domain.error.ts` - Base domain error
- `result/result.ts` - Result<T, E> type

---

### Phase 2: Inventory Module

**Task 2.1 - Domain Model**
```bash
nx g @nx/js:library modules-inventory --directory=libs/modules/inventory
```
Create entities with rich behavior:
- `Product.entity.ts` - Methods: `reserveStock()`, `releaseStock()`, `canReserve()`, `isAvailable()`, `activate()`, `deactivate()`
- `StockReservation.entity.ts` - Methods: `isExpired()`, `extend()`
- `Sku.value-object.ts`
- `OrderStatus.enum.ts`
- Repositories for Product and StockReservation
- Events: `InventoryReserved`, `InventoryReservationFailed`, `InventoryReleased`

**Task 2.2 - Features**
Create vertical slices:
- `reserve-stock/` - handler, service, dto
- `release-stock/` - handler, service
- `create-product/` - handler, service, dto
- `get-product/` - handler, service

**Task 2.3 - Event Listeners**
- `order-placed.listener.ts` - Calls `Product.reserveStock()`
- `order-cancelled.listener.ts` - Calls `Product.releaseStock()`

---

### Phase 3: Orders Module

**Task 3.1 - Domain Model**
```bash
nx g @nx/js:library modules-orders --directory=libs/modules/orders
```
Create:
- `Order.entity.ts` - State machine with methods: `create()`, `confirm()`, `reject()`, `markAsPaid()`, `markPaymentFailed()`, `markAsShipped()`, `cancel()`, `canBeCancelled()`, `calculateTotal()`
- `OrderItem.value-object.ts`
- `CustomerId.value-object.ts`
- `OrderStatus.enum.ts` - PENDING, CONFIRMED, REJECTED, PAID, PAYMENT_FAILED, SHIPPED, CANCELLED
- `Order.repository.ts`
- 7 domain events (placed, confirmed, rejected, paid, payment-failed, cancelled, shipped)

**Task 3.2 - Features**
- `place-order/` - handler, service, dto
- `cancel-order/` - handler, service
- `get-order/` - handler
- `list-orders/` - handler

**Task 3.3 - Event Listeners**
- `inventory-reserved.listener.ts` - Calls `Order.confirm()`
- `inventory-reservation-failed.listener.ts` - Calls `Order.reject()`
- `payment-processed.listener.ts` - Calls `Order.markAsPaid()`
- `payment-failed.listener.ts` - Calls `Order.markPaymentFailed()`
- `shipment-created.listener.ts` - Calls `Order.markAsShipped()`

---

### Phase 4: Payments Module

**Task 4.1 - Domain Model**
```bash
nx g @nx/js:library modules-payments --directory=libs/modules/payments
```
Create:
- `Payment.entity.ts` - Methods: `create()`, `startProcessing()`, `markAsSucceeded()`, `markAsFailed()`, `retry()`, `canBeProcessed()`, `canBeRetried()`, `calculateProcessingFee()`
- `PaymentMethod.value-object.ts`
- `PaymentStatus.enum.ts` - PENDING, PROCESSING, SUCCEEDED, FAILED
- `PaymentProcessor.service.ts` - Mock gateway with configurable success rate (90%)
- `Payment.repository.ts`
- Events: `PaymentProcessed`, `PaymentFailed`

**Task 4.2 - Features**
- `process-payment/` - handler, service
- `get-payment/` - handler

**Task 4.3 - Event Listeners**
- `order-confirmed.listener.ts` - Creates payment and calls `PaymentProcessor.processPayment()`

---

### Phase 5: Shipments Module

**Task 5.1 - Domain Model**
```bash
nx g @nx/js:library modules-shipments --directory=libs/modules/shipments
```
Create:
- `Shipment.entity.ts` - Methods: `create()`, `dispatch()`, `markAsDelivered()`, `canBeDispatched()`, `updateTracking()`, `estimateDeliveryDate()`, `isDelayed()`
- `TrackingNumber.value-object.ts`
- `ShipmentStatus.enum.ts` - PENDING, IN_TRANSIT, DELIVERED
- `Shipment.repository.ts`
- Events: `ShipmentCreated`, `ShipmentDispatched`, `ShipmentDelivered`

**Task 5.2 - Features**
- `create-shipment/` - handler, service
- `get-shipment/` - handler

**Task 5.3 - Event Listeners**
- `order-paid.listener.ts` - Creates shipment

---

### Phase 6: API Layer

**Task 6.1 - Next.js App**
```bash
nx g @nx/next:app api --directory=apps/api
```
Setup:
- `lib/database.ts` - Initialize TypeORM connection
- `lib/event-bus.ts` - Export singleton EventBus instance
- `lib/register-listeners.ts` - Register all listeners on startup

**Task 6.2 - API Routes**
Create thin route handlers:
- `api/orders/route.ts` - POST (place), GET (list)
- `api/orders/[orderId]/route.ts` - GET (single)
- `api/orders/[orderId]/cancel/route.ts` - POST
- `api/inventory/products/route.ts` - POST
- `api/inventory/products/[sku]/route.ts` - GET, PATCH
- `api/events/route.ts` - GET (query event store)
- `api/events/[eventId]/route.ts` - GET

---

### Phase 7: Testing & Docs

**Task 7.1 - Unit Tests**
Test domain logic:
- Entity state transitions
- Business rule guards (`canBeCancelled()`, `canReserve()`, etc.)
- Calculations (`calculateTotal()`, `calculateProcessingFee()`, etc.)
- Value object validation

**Task 7.2 - Integration Tests**
Test event flows:
- OrderPlaced → InventoryReserved → OrderConfirmed → PaymentProcessed → OrderPaid → ShipmentCreated
- Repository operations with database
- Feature handlers end-to-end

**Task 7.3 - E2E Tests**
Test via HTTP:
- `order-happy-path.e2e.spec.ts` - Complete flow
- `order-insufficient-stock.e2e.spec.ts` - Rejection scenario
- `order-payment-failure.e2e.spec.ts` - Payment failure + rollback
- `order-cancellation.e2e.spec.ts` - Cancellation flows

**Task 7.4 - Documentation**
- `README.md` - Setup and quick start
- `docs/ARCHITECTURE.md` - Architecture decisions
- `docs/API.md` - Endpoint reference
- `docs/EVENT_FLOWS.md` - Event choreography diagrams

---

## 4. Implementation Order

Execute phases sequentially:
1. Phase 1 (Foundation) - Required by all
2. Phase 2 (Inventory) - Independent
3. Phase 3 (Orders) - Depends on Inventory events
4. Phase 4 (Payments) - Depends on Orders events
5. Phase 5 (Shipments) - Depends on Orders events
6. Phase 6 (API) - Depends on all modules
7. Phase 7 (Testing & Docs) - Validation

---

## 5. Key Technical Decisions

- **Event Bus**: In-process, in-memory (not durable across restarts)
- **Database**: SQLite via TypeORM (simple, no external dependencies)
- **Event Handling**: Async within same process
- **Payment Gateway**: Mock with 90% success rate
- **Authentication**: None (focus on domain logic)

---

## 6. Success Criteria

Implementation complete when:
1. All domain entities have rich behavior (not anemic)
2. Event-driven flow works end-to-end
3. API returns consistent responses
4. Event store captures all state changes
5. Tests pass (unit, integration, e2e)
6. Error scenarios handled (stock failure, payment failure)
7. Cancellation works correctly

---

## 7. Quick Start Commands

```bash
# Setup
npx create-nx-workspace@latest tiny-store --preset=ts
cd tiny-store

# Generate libraries
nx g @nx/js:library shared-infrastructure --directory=libs/shared/infrastructure
nx g @nx/js:library shared-domain --directory=libs/shared/domain
nx g @nx/js:library modules-inventory --directory=libs/modules/inventory
nx g @nx/js:library modules-orders --directory=libs/modules/orders
nx g @nx/js:library modules-payments --directory=libs/modules/payments
nx g @nx/js:library modules-shipments --directory=libs/modules/shipments
nx g @nx/next:app api --directory=apps/api

# Development
nx serve api
nx test orders
nx lint
nx build api
```

---

This plan provides clear, actionable tasks that can be broken into implementation work.
