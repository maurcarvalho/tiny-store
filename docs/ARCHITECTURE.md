# Architecture

Tiny Store is a **modular monolith** implementing Domain-Driven Design with event-driven communication.

## Core Principles

### 1. Modular Monolith
- Single deployment unit
- Clear module boundaries
- Modules communicate via events only
- Shared infrastructure (database, event bus)

### 2. Domain-Driven Design
- Rich domain models (business logic in entities)
- Value objects for concepts
- Aggregate roots manage consistency
- Repository pattern for persistence

### 3. Event-Driven Architecture
- Modules publish domain events
- Modules subscribe to events from other modules
- Asynchronous event processing
- Event store for audit trail

### 4. Vertical Slice Architecture
- Features organized by capability, not layer
- Each feature is self-contained
- Thin API handlers, fat domain

## Module Structure

```
tiny-store/
├── apps/api/                           # HTTP layer (Next.js)
│   └── src/app/
│       ├── api/                        # Route handlers
│       └── lib/                        # Database, event bus
│
├── libs/modules/                       # Bounded contexts
│   ├── orders/
│   │   └── src/
│   │       ├── domain/                 # Entities, value objects, events
│   │       ├── features/               # Use cases (vertical slices)
│   │       └── listeners/              # Event handlers
│   ├── inventory/
│   ├── payments/
│   └── shipments/
│
└── libs/shared/
    ├── domain/                         # Base classes, shared value objects
    ├── infrastructure/                 # Event bus, database, event store
    └── testing/                        # Test utilities
```

## Module Boundaries

### What Modules CAN Access

✅ **Public API from other modules:**
- Feature handlers (PlaceOrderHandler, GetProductHandler)
- Event listeners
- DTOs

✅ **Shared libraries:**
- Shared domain (Money, Address, Result)
- Shared infrastructure (EventBus, BaseRepository)

✅ **Events:**
- Subscribe to events from any module
- Publish their own events

### What Modules CANNOT Access

❌ **Private internals from other modules:**
- Domain entities (Order, Product, Payment)
- Repositories (OrderRepository, ProductRepository)
- Value objects (OrderItem, CustomerId, Sku)
- Internal services
- TypeORM entities

**Enforcement:** Module boundary tests verify these rules.

## Event Flow Example

### Order Placement Flow

```
1. POST /api/orders
   ↓
2. PlaceOrderHandler
   ↓
3. OrderAggregate.create()
   ↓
4. Publish: OrderPlaced
   ↓
5. OrderPlacedListener (Inventory)
   ↓
6. ReserveStockService
   ↓
7. ProductAggregate.reserveStock()
   ↓
8. Publish: InventoryReserved
   ↓
9. InventoryReservedListener (Orders)
   ↓
10. OrderAggregate.confirm()
   ↓
11. Publish: OrderConfirmed
   ↓
12. OrderConfirmedListener (Payments)
   ↓
13. ProcessPaymentService
   ↓
14. PaymentAggregate.process()
   ↓
15. Publish: PaymentProcessed
   ↓
16. PaymentProcessedListener (Orders)
   ↓
17. OrderAggregate.markAsPaid()
   ↓
18. Publish: OrderPaid
   ↓
19. OrderPaidListener (Shipments)
   ↓
20. CreateShipmentService
   ↓
21. ShipmentAggregate.create()
   ↓
22. Publish: ShipmentCreated
```

## Domain Models

### Order Aggregate

**States:** PENDING → CONFIRMED → PAID → SHIPPED  
**Alternative:** PENDING → REJECTED

**Business Rules:**
- Cannot cancel after shipment
- Must confirm before payment
- Total calculated from items

**Events:**
- OrderPlaced
- OrderConfirmed
- OrderRejected
- OrderPaid
- OrderPaymentFailed
- OrderShipped
- OrderCancelled

### Product Aggregate

**Business Rules:**
- Cannot reserve more than available
- Stock = available + reserved
- Inactive products cannot be reserved

**Events:**
- InventoryReserved
- InventoryReservationFailed
- InventoryReleased

### Payment Aggregate

**States:** PENDING → PROCESSING → SUCCEEDED  
**Alternative:** PENDING → PROCESSING → FAILED

**Business Rules:**
- Max 3 retries on failure
- Processing fee calculated based on amount

**Events:**
- PaymentProcessed
- PaymentFailed

### Shipment Aggregate

**States:** PENDING → DISPATCHED → DELIVERED

**Events:**
- ShipmentCreated
- ShipmentDispatched
- ShipmentDelivered

## Data Flow

### 1. Command (Write)
```
HTTP Request
  ↓
Handler (thin)
  ↓
Service (orchestration)
  ↓
Aggregate (business logic)
  ↓
Repository.save()
  ↓
EventBus.publish()
```

### 2. Query (Read)
```
HTTP Request
  ↓
Handler
  ↓
Repository.find()
  ↓
DTO mapping
  ↓
HTTP Response
```

### 3. Event Processing
```
EventBus.publish()
  ↓
Listener (async)
  ↓
Handler
  ↓
Service
  ↓
Aggregate
  ↓
Repository.save()
  ↓
EventBus.publish() (next event)
```

## Technology Stack

- **Runtime:** Node.js 18+
- **Language:** TypeScript (strict mode)
- **Framework:** Next.js 15 (App Router)
- **Monorepo:** Nx
- **Database:** SQLite via TypeORM
- **Event Bus:** In-memory pub/sub
- **Testing:** Jest (310+ tests)

## Design Patterns

### 1. Repository Pattern
Abstracts data access:
```typescript
class OrderRepository extends BaseRepository<OrderEntity> {
  async findById(id: string): Promise<Order | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? Order.reconstitute(entity) : null;
  }
}
```

### 2. Result Type
Functional error handling:
```typescript
const result = Money.create(100, 'USD');
if (result.isSuccess()) {
  const money = result.getValue();
} else {
  const error = result.getError();
}
```

### 3. Domain Events
Decoupled communication:
```typescript
class Order extends AggregateRoot {
  confirm() {
    this.status = OrderStatus.CONFIRMED;
    this.addDomainEvent(createOrderConfirmedEvent(this.id));
  }
}
```

### 4. Value Objects
Immutable concepts:
```typescript
class Money extends ValueObject<{ amount: number; currency: string }> {
  add(other: Money): Money {
    if (!this.hasSameCurrency(other)) {
      throw new Error('Currency mismatch');
    }
    return Money.create(this.amount + other.amount, this.currency);
  }
}
```

## Trade-offs

### Chosen
- **Modular monolith** (simple deployment, clear boundaries)
- **In-memory event bus** (no external dependencies)
- **SQLite** (zero configuration)
- **Async event processing** (eventual consistency)

### Not Chosen
- Microservices (too complex for this scope)
- External message broker (adds infrastructure)
- PostgreSQL (more setup required)
- Synchronous event processing (tight coupling)

## Scalability Considerations

**Current (Single Instance):**
- In-memory event bus
- Single database connection
- No caching

**Future (Multiple Instances):**
- External message broker (RabbitMQ/Kafka)
- Redis for caching
- PostgreSQL for production
- Distributed tracing
- Circuit breakers

## Testing Strategy

- **Unit Tests:** Domain logic (150 tests)
- **Boundary Tests:** Module isolation (20 tests)
- **Integration Tests:** Event flows (35 tests)
- **API Tests:** HTTP endpoints (80+ tests)
- **Performance Tests:** Load & concurrency (25 tests)

See [TESTING.md](./TESTING.md) for details.
