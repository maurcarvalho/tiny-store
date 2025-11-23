# Anti-Patterns to Avoid

When working with this modular monolith, avoid these common mistakes that break architectural boundaries:

## ❌ Direct Module Dependencies

**WRONG** - Directly importing and using services from other modules:

```typescript
// ❌ WRONG - Direct dependency between modules
import { InventoryService } from '@tiny-store/modules-inventory';

class OrderService {
  constructor(
    private inventoryService: InventoryService  // Direct dependency!
  ) {}
  
  async placeOrder(orderData: OrderData) {
    // Directly calling another module's service
    const stock = await this.inventoryService.checkStock(orderData.sku);
    // ...
  }
}
```

**CORRECT** - Use events for inter-module communication:

```typescript
// ✅ CORRECT - Event-driven communication
import { EventBus } from '@tiny-store/shared-infrastructure';

class OrderService {
  constructor(
    private eventBus: EventBus  // Events only!
  ) {}
  
  async placeOrder(orderData: OrderData) {
    const order = Order.create(orderData);
    // Publish event instead of direct call
    this.eventBus.publish(new OrderPlacedEvent(order));
    // ...
  }
}
```

**Another Example - Email Notifications:**

```typescript
// ❌ WRONG - Directly calling mailing infrastructure from Order module
import { EmailService } from '@tiny-store/shared-infrastructure';
import { smtpConfig } from '@tiny-store/shared-infrastructure';

class OrderService {
  constructor(
    private emailService: EmailService  // Direct infrastructure dependency!
  ) {}
  
  async confirmOrder(orderId: string) {
    const order = await this.orderRepository.findById(orderId);
    order.confirm();
    await this.orderRepository.save(order);
    
    // Directly calling email infrastructure in Order module!
    await this.emailService.send({
      to: order.customerEmail,
      subject: 'Order Confirmed',
      body: `Your order ${order.id} has been confirmed.`
    });
  }
}
```

```typescript
// ✅ CORRECT - Notifications module handles emails via events
import { EventBus } from '@tiny-store/shared-infrastructure';

class OrderService {
  constructor(
    private eventBus: EventBus  // Events only!
  ) {}
  
  async confirmOrder(orderId: string) {
    const order = await this.orderRepository.findById(orderId);
    order.confirm();
    await this.orderRepository.save(order);
    
    // Publish event - notifications module will handle email
    this.eventBus.publish(new OrderConfirmedEvent({
      orderId: order.id,
      customerEmail: order.customerEmail,
      total: order.total
    }));
  }
}

// Notifications module listens and handles email
class OrderConfirmedListener {
  constructor(
    private emailService: EmailService  // Infrastructure only in notifications module
  ) {}
  
  async handle(event: OrderConfirmedEvent) {
    await this.emailService.send({
      to: event.customerEmail,
      subject: 'Order Confirmed',
      body: `Your order ${event.orderId} has been confirmed.`
    });
  }
}
```

## ❌ Cross-Schema Database Access

**WRONG** - Querying another module's database tables directly:

```typescript
// ❌ WRONG - Accessing another module's data directly
import { getRepository } from 'typeorm';
import { InventoryItem } from '@tiny-store/modules-inventory';

class OrderRepository {
  async checkStock(productId: string) {
    // Directly querying inventory module's schema
    const inventoryRepo = getRepository(InventoryItem);
    const item = await inventoryRepo.findOne({ 
      where: { productId } 
    });
    return item?.stockQuantity ?? 0;
  }
}
```

**CORRECT** - Query only your own schema, communicate via events:

```typescript
// ✅ CORRECT - Each module manages its own data
class OrderRepository {
  async findById(orderId: string): Promise<Order | null> {
    // Only query your own module's data
    return await this.repository.findOne({ 
      where: { id: orderId } 
    });
  }
}

// Inventory module listens to events and updates its own data
class InventoryReservationListener {
  async handle(event: OrderPlacedEvent) {
    // Inventory module queries its own schema
    const item = await this.inventoryRepository.findBySku(event.sku);
    // ...
  }
}
```

## ❌ Business Logic in Shared Package

**WRONG** - Putting module-specific business logic in shared packages:

```typescript
// ❌ WRONG - Module-specific logic in shared package
// libs/shared/domain/order-validator.ts
export class OrderValidator {
  validateOrderStatus(order: Order): boolean {
    // Order-specific validation in shared package!
    return order.status !== OrderStatus.SHIPPED;
  }
}
```

**CORRECT** - Keep business logic within the appropriate module:

```typescript
// ✅ CORRECT - Keep logic in the module
// libs/modules/orders/src/domain/services/order-validator.ts
export class OrderValidator {
  validateOrderStatus(order: Order): boolean {
    // Order-specific validation stays in orders module
    return order.status !== OrderStatus.SHIPPED;
  }
}
```

**Remember:** Shared packages should only contain:
- Base classes and interfaces (Entity, AggregateRoot, ValueObject)
- Truly shared value objects (Money, Address)
- Infrastructure utilities (EventBus, Database config)
- **NOT** module-specific business logic

## ❌ Anemic Domain Models

**WRONG** - Entities with only getters and setters, no business logic:

```typescript
// ❌ WRONG - Anemic domain model
class Order {
  private _status: OrderStatus;
  private _items: OrderItem[];
  
  get status(): OrderStatus {
    return this._status;
  }
  
  set status(value: OrderStatus) {
    this._status = value;  // No validation, no business rules!
  }
  
  get items(): OrderItem[] {
    return this._items;
  }
  
  set items(value: OrderItem[]) {
    this._items = value;  // No invariants enforced!
  }
}

// Business logic lives in service layer
class OrderService {
  confirmOrder(order: Order) {
    if (order.status !== OrderStatus.PENDING) {
      throw new Error('Invalid state');
    }
    order.status = OrderStatus.CONFIRMED;  // Logic outside entity!
  }
}
```

**CORRECT** - Rich domain models with behavior:

```typescript
// ✅ CORRECT - Rich domain model with business logic
class Order extends AggregateRoot {
  private status: OrderStatus;
  private items: OrderItem[];
  
  confirm(): void {
    // Business rules enforced in the entity
    if (this.status !== OrderStatus.PENDING) {
      throw new BusinessRuleViolationError(
        'Only pending orders can be confirmed'
      );
    }
    this.status = OrderStatus.CONFIRMED;
    this.addDomainEvent(createOrderConfirmedEvent(this.id));
  }
  
  cancel(): void {
    if (this.status === OrderStatus.SHIPPED) {
      throw new BusinessRuleViolationError(
        'Cannot cancel shipped orders'
      );
    }
    this.status = OrderStatus.CANCELLED;
    this.addDomainEvent(createOrderCancelledEvent(this.id));
  }
}
```

## ❌ Horizontal Layer Organization

**WRONG** - Organizing code by technical layers instead of features:

```typescript
// ❌ WRONG - Horizontal layers
libs/modules/orders/src/
├── controllers/        # All controllers together
│   ├── order.controller.ts
│   └── payment.controller.ts
├── services/          # All services together
│   ├── order.service.ts
│   └── payment.service.ts
├── repositories/      # All repositories together
│   └── order.repository.ts
└── entities/         # All entities together
    └── order.entity.ts
```

**CORRECT** - Vertical slice architecture (organize by feature):

```typescript
// ✅ CORRECT - Vertical slices (features)
libs/modules/orders/src/
├── features/
│   ├── place-order/           # Everything for placing orders
│   │   ├── place-order.handler.ts
│   │   ├── place-order.service.ts
│   │   ├── place-order.request.ts
│   │   ├── place-order.response.ts
│   │   └── place-order.spec.ts
│   ├── cancel-order/          # Everything for canceling orders
│   │   ├── cancel-order.handler.ts
│   │   └── ...
│   └── get-order/
│       └── ...
├── domain/
│   ├── entities/
│   ├── value-objects/
│   └── events/
└── listeners/
```

## ❌ Business Logic in Controllers/Handlers

**WRONG** - Putting business rules in HTTP handlers:

```typescript
// ❌ WRONG - Business logic in handler
export async function POST(request: Request) {
  const data = await request.json();
  
  // Business logic in HTTP handler!
  if (data.items.length === 0) {
    return Response.json({ error: 'Order must have items' }, { status: 400 });
  }
  
  const total = data.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  if (total < 10) {
    return Response.json({ error: 'Minimum order is $10' }, { status: 400 });
  }
  
  // Database access in handler
  const order = await orderRepository.save({
    customerId: data.customerId,
    items: data.items,
    total: total,
    status: 'PENDING'
  });
  
  return Response.json(order);
}
```

**CORRECT** - Thin handlers, fat domain:

```typescript
// ✅ CORRECT - Handler delegates to domain
export async function POST(request: Request) {
  const data = await request.json();
  
  // Handler only: parse, validate input, delegate
  const handler = new PlaceOrderHandler(
    orderRepository,
    eventBus
  );
  
  const result = await handler.handle({
    customerId: data.customerId,
    items: data.items,
    shippingAddress: data.shippingAddress
  });
  
  if (result.isFailure()) {
    return Response.json(
      { error: result.getError().message },
      { status: 400 }
    );
  }
  
  return Response.json(result.getValue(), { status: 201 });
}

// Business logic in domain entity
class Order extends AggregateRoot {
  static create(data: CreateOrderData): Result<Order, DomainError> {
    // Business rules enforced here
    if (data.items.length === 0) {
      return Result.fail(new DomainError('Order must have items'));
    }
    
    const order = new Order();
    order.items = data.items.map(item => OrderItem.create(item));
    order.total = order.calculateTotal();  // Business logic in entity
    order.status = OrderStatus.PENDING;
    
    return Result.ok(order);
  }
}
```

## ❌ Shared State Between Modules

**WRONG** - Sharing mutable state across module boundaries:

```typescript
// ❌ WRONG - Shared mutable state
// libs/shared/state/global-state.ts
export const globalState = {
  currentUser: null as User | null,
  currentOrder: null as Order | null,
  cart: [] as CartItem[]
};

// Used across multiple modules
import { globalState } from '@tiny-store/shared-state';

class OrderService {
  placeOrder() {
    const user = globalState.currentUser;  // Shared state!
    // ...
  }
}

class PaymentService {
  processPayment() {
    const order = globalState.currentOrder;  // Shared state!
    // ...
  }
}
```

**CORRECT** - Each module manages its own state, communicate via events:

```typescript
// ✅ CORRECT - Module-owned state, event-driven communication
class OrderService {
  private orderRepository: OrderRepository;
  
  async placeOrder(data: PlaceOrderData) {
    const order = Order.create(data);
    await this.orderRepository.save(order);
    
    // Publish event instead of sharing state
    this.eventBus.publish(new OrderPlacedEvent({
      orderId: order.id,
      customerId: order.customerId,
      total: order.total
    }));
  }
}

class PaymentService {
  constructor(
    private paymentRepository: PaymentRepository,
    private eventBus: EventBus
  ) {}
  
  // Listen to events, don't access shared state
  async handleOrderPlaced(event: OrderPlacedEvent) {
    const payment = Payment.create({
      orderId: event.orderId,
      amount: event.total
    });
    await this.paymentRepository.save(payment);
  }
}
```

## ❌ Lack of Nx Dependency Constraints

**WRONG** - No enforcement of module boundaries:

```typescript
// ❌ WRONG - No Nx tags or dependency rules
// Any module can import from any other module
// No enforcement of architectural boundaries
```

**CORRECT** - Use Nx tags and dependency rules:

```json
// ✅ CORRECT - Enforce boundaries with Nx
// nx.json
{
  "targetDefaults": {
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["{projectRoot}/**/*.ts"]
      }
    }
  },
  "plugins": [
    {
      "plugin": "@nx/eslint-plugin",
      "options": {
        "rules": {
          "enforce-module-boundaries": [
            "error",
            {
              "depConstraints": [
                {
                  "sourceTag": "module:orders",
                  "onlyDependOnLibsWithTags": ["shared:domain", "shared:infrastructure"]
                },
                {
                  "sourceTag": "module:inventory",
                  "onlyDependOnLibsWithTags": ["shared:domain", "shared:infrastructure"]
                },
                {
                  "sourceTag": "shared:domain",
                  "onlyDependOnLibsWithTags": []
                }
              ]
            }
          ]
        }
      }
    }
  ]
}
```

## ❌ Synchronous Event Processing

**WRONG** - Waiting for event handlers to complete synchronously:

```typescript
// ❌ WRONG - Synchronous event processing
class OrderService {
  async placeOrder(data: PlaceOrderData) {
    const order = Order.create(data);
    await this.repository.save(order);
    
    // Synchronously waiting for all handlers
    await this.eventBus.publishAndWait(new OrderPlacedEvent(order));
    // Blocks until inventory, payments, etc. all complete
    
    return order;  // Only returns after all downstream processing
  }
}
```

**CORRECT** - Asynchronous event processing:

```typescript
// ✅ CORRECT - Fire and forget, eventual consistency
class OrderService {
  async placeOrder(data: PlaceOrderData) {
    const order = Order.create(data);
    await this.repository.save(order);
    
    // Publish asynchronously, don't wait
    this.eventBus.publish(new OrderPlacedEvent(order));
    // Returns immediately, handlers process asynchronously
    
    return order;  // Returns based on own invariants
  }
}

// Event handlers process independently
class InventoryReservationListener {
  async handle(event: OrderPlacedEvent) {
    // Processes asynchronously, doesn't block order creation
    await this.reserveStock(event.orderId, event.items);
  }
}
```

## Summary

These anti-patterns violate the core principles of modular monolith architecture:

- **Direct dependencies** → Breaks module boundaries
- **Cross-schema access** → Violates data ownership
- **Business logic in shared** → Creates coupling
- **Anemic models** → Moves logic out of domain
- **Horizontal layers** → Makes features hard to find
- **Logic in handlers** → Violates separation of concerns
- **Shared state** → Creates hidden dependencies
- **No Nx constraints** → Allows architectural violations
- **Synchronous events** → Creates tight coupling

**Enforcement:** These patterns are prevented by:
- Nx module boundary rules (enforced at build time)
- Architecture tests (20+ boundary tests)
- Code review guidelines
- Project constitution (`.speckit/constitution.md`)

