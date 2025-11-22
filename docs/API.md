# API Reference

Complete HTTP API for the Tiny Store order management system.

**Base URL:** `http://localhost:3000/api`

## Quick Reference

```bash
# Health
GET    /health

# Products
POST   /inventory/products          # Create product
GET    /inventory/products/:sku     # Get product
PATCH  /inventory/products/:sku     # Update stock

# Orders
POST   /orders                      # Place order
GET    /orders                      # List orders
GET    /orders/:orderId             # Get order
POST   /orders/:orderId/cancel      # Cancel order

# Events
GET    /events                      # Query events
GET    /events/:eventId             # Get event
```

## Products

### Create Product

```http
POST /inventory/products
Content-Type: application/json

{
  "sku": "WIDGET-001",
  "name": "Super Widget",
  "price": 99.99,
  "currency": "USD",
  "stockQuantity": 100
}
```

**Response:** `201 Created`
```json
{
  "productId": "550e8400-e29b-41d4-a716-446655440000",
  "sku": "WIDGET-001",
  "name": "Super Widget",
  "stockQuantity": 100,
  "availableStock": 100
}
```

**Errors:**
- `400` - Invalid data (negative stock, invalid currency, empty SKU)

### Get Product

```http
GET /inventory/products/WIDGET-001
```

**Response:** `200 OK`
```json
{
  "productId": "550e8400-e29b-41d4-a716-446655440000",
  "sku": "WIDGET-001",
  "name": "Super Widget",
  "stockQuantity": 100,
  "availableStock": 95,
  "reservedQuantity": 5,
  "status": "ACTIVE"
}
```

**Errors:**
- `404` - Product not found

### Update Stock

```http
PATCH /inventory/products/WIDGET-001
Content-Type: application/json

{
  "stockQuantity": 150
}
```

**Response:** `200 OK`
```json
{
  "productId": "550e8400-e29b-41d4-a716-446655440000",
  "sku": "WIDGET-001",
  "name": "Super Widget",
  "stockQuantity": 150,
  "availableStock": 145,
  "reservedQuantity": 5,
  "status": "ACTIVE"
}
```

## Orders

### Place Order

```http
POST /orders
Content-Type: application/json

{
  "customerId": "customer-123",
  "items": [
    {
      "sku": "WIDGET-001",
      "quantity": 2,
      "unitPrice": 99.99,
      "currency": "USD"
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "postalCode": "62701",
    "country": "USA"
  }
}
```

**Response:** `201 Created`
```json
{
  "orderId": "660e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "customerId": "customer-123",
  "totalAmount": 199.98,
  "currency": "USD",
  "placedAt": "2025-11-22T10:30:00Z"
}
```

**Errors:**
- `400` - Invalid data (empty items, invalid address, negative quantity)

**Note:** Order starts as `PENDING` and progresses through states asynchronously:
```
PENDING → CONFIRMED → PAID → SHIPPED
        ↘ REJECTED (if insufficient stock or payment fails)
```

### Get Order

```http
GET /orders/660e8400-e29b-41d4-a716-446655440000
```

**Response:** `200 OK`
```json
{
  "orderId": "660e8400-e29b-41d4-a716-446655440000",
  "status": "PAID",
  "customerId": "customer-123",
  "items": [
    {
      "sku": "WIDGET-001",
      "quantity": 2,
      "unitPrice": 99.99,
      "currency": "USD"
    }
  ],
  "shippingAddress": { /* ... */ },
  "totalAmount": 199.98,
  "currency": "USD",
  "placedAt": "2025-11-22T10:30:00Z",
  "updatedAt": "2025-11-22T10:31:30Z"
}
```

**Errors:**
- `404` - Order not found

### List Orders

```http
GET /orders
GET /orders?status=PAID
GET /orders?customerId=customer-123
GET /orders?status=PENDING&customerId=customer-123
```

**Response:** `200 OK`
```json
[
  {
    "orderId": "660e8400-e29b-41d4-a716-446655440000",
    "status": "PAID",
    "customerId": "customer-123",
    "totalAmount": 199.98,
    "placedAt": "2025-11-22T10:30:00Z"
  }
]
```

**Query Parameters:**
- `status` - Filter by order status (PENDING, CONFIRMED, PAID, SHIPPED, REJECTED, CANCELLED)
- `customerId` - Filter by customer ID

### Cancel Order

```http
POST /orders/660e8400-e29b-41d4-a716-446655440000/cancel
```

**Response:** `200 OK`
```json
{
  "orderId": "660e8400-e29b-41d4-a716-446655440000",
  "status": "CANCELLED",
  "cancelledAt": "2025-11-22T10:35:00Z"
}
```

**Errors:**
- `400` - Order cannot be cancelled (already shipped)
- `404` - Order not found

**Note:** Cancelling releases reserved inventory.

## Events

### Query Events

```http
GET /events
GET /events?eventType=OrderPlaced
GET /events?aggregateId=660e8400-e29b-41d4-a716-446655440000
GET /events?eventType=OrderPlaced&aggregateId=660e8400-e29b-41d4-a716-446655440000
```

**Response:** `200 OK`
```json
[
  {
    "eventId": "770e8400-e29b-41d4-a716-446655440000",
    "eventType": "OrderPlaced",
    "aggregateId": "660e8400-e29b-41d4-a716-446655440000",
    "aggregateType": "Order",
    "occurredAt": "2025-11-22T10:30:00Z",
    "payload": {
      "orderId": "660e8400-e29b-41d4-a716-446655440000",
      "customerId": "customer-123",
      "items": [...]
    },
    "version": 1
  }
]
```

**Query Parameters:**
- `eventType` - Filter by event type
- `aggregateId` - Filter by aggregate ID

**Event Types:**
- `OrderPlaced`, `OrderConfirmed`, `OrderRejected`, `OrderPaid`, `OrderPaymentFailed`, `OrderShipped`, `OrderCancelled`
- `InventoryReserved`, `InventoryReservationFailed`, `InventoryReleased`
- `PaymentProcessed`, `PaymentFailed`
- `ShipmentCreated`, `ShipmentDispatched`, `ShipmentDelivered`

### Get Event

```http
GET /events/770e8400-e29b-41d4-a716-446655440000
```

**Response:** `200 OK`
```json
{
  "eventId": "770e8400-e29b-41d4-a716-446655440000",
  "eventType": "OrderPlaced",
  "aggregateId": "660e8400-e29b-41d4-a716-446655440000",
  "aggregateType": "Order",
  "occurredAt": "2025-11-22T10:30:00Z",
  "payload": { /* ... */ },
  "version": 1
}
```

**Errors:**
- `404` - Event not found

## Error Format

All errors follow a consistent format:

```json
{
  "error": "Product not found"
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error

## Examples

### Complete Order Flow

```bash
# 1. Create product
curl -X POST http://localhost:3000/api/inventory/products \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "WIDGET-001",
    "name": "Super Widget",
    "price": 99.99,
    "currency": "USD",
    "stockQuantity": 100
  }'

# 2. Place order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "items": [{
      "sku": "WIDGET-001",
      "quantity": 2,
      "unitPrice": 99.99,
      "currency": "USD"
    }],
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Springfield",
      "state": "IL",
      "postalCode": "62701",
      "country": "USA"
    }
  }'

# 3. Wait for processing (events are async)
sleep 2

# 4. Check order status
curl http://localhost:3000/api/orders/{orderId}

# 5. Check inventory
curl http://localhost:3000/api/inventory/products/WIDGET-001

# 6. Query events
curl http://localhost:3000/api/events?aggregateId={orderId}
```
