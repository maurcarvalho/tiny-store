# Spec: Order Lifecycle Management System

**Version:** 1.0  
**Created:** 2025-11-22  
**Status:** Draft

---

## 1. Overview

This spec describes an end-to-end order lifecycle management system for the Tiny Store backend. The system orchestrates the flow from order placement through inventory reservation, payment processing, shipment creation, and potential cancellation, while maintaining a complete audit trail through domain events.

---

## 2. Bounded Contexts

### 2.1 Orders

**Responsibilities:**
- Accept and validate customer orders
- Track order lifecycle state
- Coordinate with other contexts via events
- Handle order cancellation requests

**Domain Entities:**
- `Order` - Aggregate root containing order state and line items
- `OrderItem` - Value object representing a single product quantity in an order

**Order States:**
```
PENDING → CONFIRMED → PAID → SHIPPED → DELIVERED
              ↓          ↓
          CANCELLED  CANCELLED
```

**Key Business Rules:**
- Orders can only be cancelled if not yet shipped
- Order total must be positive
- Each order item must have quantity ≥ 1

**Events Published:**
- `OrderPlaced` - When a new order is created
- `OrderConfirmed` - When inventory is successfully reserved
- `OrderRejected` - When inventory reservation fails
- `OrderPaid` - When payment succeeds
- `OrderPaymentFailed` - When payment fails
- `OrderCancelled` - When an order is cancelled
- `OrderShipped` - When shipment is created

**Events Listened To:**
- `InventoryReserved` (from Inventory)
- `InventoryReservationFailed` (from Inventory)
- `PaymentProcessed` (from Payments)
- `PaymentFailed` (from Payments)
- `ShipmentCreated` (from Shipments)

---

### 2.2 Inventory

**Responsibilities:**
- Track product stock levels
- Reserve stock for orders
- Release reserved stock on cancellation
- Prevent overselling

**Domain Entities:**
- `Product` - Aggregate root with SKU and stock quantity
- `StockReservation` - Entity tracking reserved quantities per order

**Key Business Rules:**
- Stock cannot go negative
- Reservations must be for available stock
- Released reservations return stock to available pool

**Events Published:**
- `InventoryReserved` - When stock is successfully reserved
- `InventoryReservationFailed` - When insufficient stock
- `InventoryReleased` - When reserved stock is returned

**Events Listened To:**
- `OrderPlaced` (from Orders) - Triggers reservation attempt
- `OrderCancelled` (from Orders) - Triggers stock release

---

### 2.3 Payments

**Responsibilities:**
- Process payments for confirmed orders
- Track payment status
- Handle payment failures

**Domain Entities:**
- `Payment` - Aggregate root tracking payment state and amount
- `PaymentMethod` - Value object (simplified: credit card, etc.)

**Payment States:**
```
PENDING → PROCESSING → SUCCEEDED
              ↓
           FAILED
```

**Key Business Rules:**
- Payment amount must match order total
- Only one successful payment per order
- Failed payments can be retried

**Events Published:**
- `PaymentProcessed` - When payment succeeds
- `PaymentFailed` - When payment fails

**Events Listened To:**
- `OrderConfirmed` (from Orders) - Triggers payment attempt

---

### 2.4 Shipments

**Responsibilities:**
- Create shipments for paid orders
- Track shipment status
- Prevent shipment of unpaid orders

**Domain Entities:**
- `Shipment` - Aggregate root with tracking details
- `ShippingAddress` - Value object

**Shipment States:**
```
PENDING → IN_TRANSIT → DELIVERED
```

**Key Business Rules:**
- Shipments can only be created for paid orders
- Each order gets exactly one shipment

**Events Published:**
- `ShipmentCreated` - When shipment is generated
- `ShipmentDispatched` - When physically shipped
- `ShipmentDelivered` - When delivered

**Events Listened To:**
- `OrderPaid` (from Orders) - Triggers shipment creation

---

## 3. Use Cases

### 3.1 Place Order (Happy Path)

**Actor:** Customer

**Preconditions:**
- Products exist with sufficient stock

**Flow:**
1. Customer submits order with items and shipping address
2. Orders module creates order in PENDING state
3. Orders module publishes `OrderPlaced` event
4. Inventory module listens and attempts to reserve stock
5. If successful, Inventory publishes `InventoryReserved`
6. Orders module listens and transitions to CONFIRMED state
7. Orders module publishes `OrderConfirmed`
8. Payments module listens and processes payment
9. If successful, Payments publishes `PaymentProcessed`
10. Orders module listens and transitions to PAID state
11. Orders module publishes `OrderPaid`
12. Shipments module listens and creates shipment
13. Shipments publishes `ShipmentCreated`
14. Orders module listens and transitions to SHIPPED state

**Postconditions:**
- Order is in SHIPPED state
- Inventory is reduced
- Payment is recorded
- Shipment exists

---

### 3.2 Place Order (Insufficient Stock)

**Flow:**
1-3. Same as happy path
4. Inventory module attempts reservation but stock insufficient
5. Inventory publishes `InventoryReservationFailed`
6. Orders module listens and transitions to REJECTED state
7. Orders module publishes `OrderRejected`

**Postconditions:**
- Order is in REJECTED state
- No inventory change
- No payment or shipment

---

### 3.3 Place Order (Payment Failure)

**Flow:**
1-7. Same as happy path through CONFIRMED state
8. Payments module processes but payment fails
9. Payments publishes `PaymentFailed`
10. Orders module listens and transitions to PAYMENT_FAILED state
11. Orders module publishes `OrderPaymentFailed`
12. Inventory module listens and releases reserved stock
13. Inventory publishes `InventoryReleased`

**Postconditions:**
- Order is in PAYMENT_FAILED state
- Inventory reservation is released
- No shipment

---

### 3.4 Cancel Order

**Actor:** Customer or System

**Preconditions:**
- Order exists
- Order is not yet SHIPPED

**Flow:**
1. Cancel order request received
2. Orders module validates cancellation is allowed
3. Orders module transitions to CANCELLED state
4. Orders module publishes `OrderCancelled`
5. If inventory was reserved, Inventory listens and releases stock
6. Inventory publishes `InventoryReleased`

**Postconditions:**
- Order is in CANCELLED state
- Reserved inventory is released

---

## 4. API Endpoints

All endpoints follow REST conventions and return consistent JSON envelopes.

### 4.1 Orders

```
POST /api/orders
- Creates a new order
- Body: { customerId, items: [{ sku, quantity }], shippingAddress }
- Returns: { orderId, status, createdAt }

GET /api/orders/:orderId
- Retrieves order details
- Returns: { order, items, status, events }

POST /api/orders/:orderId/cancel
- Cancels an order
- Returns: { orderId, status }

GET /api/orders
- Lists orders with optional filters
- Query: ?status=PENDING&customerId=123
- Returns: { orders: [...] }
```

### 4.2 Inventory

```
POST /api/inventory/products
- Creates a new product
- Body: { sku, name, stockQuantity }
- Returns: { productId, sku, stockQuantity }

GET /api/inventory/products/:sku
- Retrieves product details
- Returns: { product, availableStock, reservedStock }

PATCH /api/inventory/products/:sku
- Updates stock quantity
- Body: { stockQuantity }
- Returns: { sku, stockQuantity }
```

### 4.3 Events

```
GET /api/events
- Retrieves all events for audit/debugging
- Query: ?orderId=123&eventType=OrderPlaced
- Returns: { events: [...] }

GET /api/events/:eventId
- Retrieves a specific event
- Returns: { event, payload, timestamp }
```

---

## 5. Event Schema

All events follow a consistent structure:

```typescript
interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  occurredAt: Date;
  payload: Record<string, any>;
  version: number;
}
```

### Key Events:

**OrderPlaced**
```json
{
  "eventType": "OrderPlaced",
  "aggregateId": "order-123",
  "aggregateType": "Order",
  "payload": {
    "orderId": "order-123",
    "customerId": "customer-456",
    "items": [{ "sku": "WIDGET-001", "quantity": 2 }],
    "totalAmount": 59.98
  }
}
```

**InventoryReserved**
```json
{
  "eventType": "InventoryReserved",
  "aggregateId": "product-widget-001",
  "aggregateType": "Product",
  "payload": {
    "orderId": "order-123",
    "reservations": [{ "sku": "WIDGET-001", "quantity": 2 }]
  }
}
```

**PaymentProcessed**
```json
{
  "eventType": "PaymentProcessed",
  "aggregateId": "payment-789",
  "aggregateType": "Payment",
  "payload": {
    "paymentId": "payment-789",
    "orderId": "order-123",
    "amount": 59.98,
    "method": "CREDIT_CARD"
  }
}
```

---

## 6. Non-Functional Requirements

### 6.1 Observability
- All events must be persisted in an append-only event store
- Events must include sufficient context to reconstruct order history
- API should support filtering events by order, type, or time range

### 6.2 Data Consistency
- Each module maintains its own data consistency
- Cross-module consistency is eventual via events
- Event handlers must be idempotent where possible

### 6.3 Error Handling
- All errors must be logged with context
- Failed event handlers must not crash the application
- API errors must include helpful messages for debugging

### 6.4 Development Experience
- Clear separation of concerns via bounded contexts
- Easy to trace order flow through event history
- Simple to add new event listeners or extend behavior

---

## 7. Out of Scope

The following are explicitly out of scope for this implementation:

- User authentication and authorization
- Real payment gateway integration (use mock/simulator)
- Real shipping carrier integration
- Distributed transactions or saga orchestration
- External message broker (using in-process event bus)
- Horizontal scaling considerations
- Production-grade error recovery and retry mechanisms
- Complex inventory management (batches, expiry, warehouses)
- Partial shipments or returns
- Dynamic pricing or promotions

---

## 8. Success Criteria

This spec is successfully implemented when:

1. ✅ Orders can be placed and flow through all states
2. ✅ Inventory is correctly reserved and released
3. ✅ Payments succeed or fail with proper handling
4. ✅ Shipments are created only for paid orders
5. ✅ Orders can be cancelled when appropriate
6. ✅ All state changes generate events
7. ✅ Events can be queried for debugging
8. ✅ Code follows the constitution's architectural principles
9. ✅ Basic tests cover critical paths

---

## 9. Future Enhancements

Possible future additions (not in current scope):

- Order history and customer profiles
- Advanced inventory features (backorders, suppliers)
- Multiple payment methods and refunds
- Shipment tracking updates
- Notifications (email, SMS)
- Admin dashboard
- Reporting and analytics
