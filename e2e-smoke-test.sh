#!/bin/bash
set -e

API="http://localhost:3000/api"
PASS=0
FAIL=0
TOTAL=0

test_case() {
  TOTAL=$((TOTAL + 1))
  local name="$1"
  local expected="$2"
  local actual="$3"
  if echo "$actual" | grep -q "$expected"; then
    PASS=$((PASS + 1))
    echo "  ✅ $name"
  else
    FAIL=$((FAIL + 1))
    echo "  ❌ $name — expected '$expected', got: $actual"
  fi
}

test_status() {
  TOTAL=$((TOTAL + 1))
  local name="$1"
  local expected_code="$2"
  local actual_code="$3"
  if [ "$actual_code" = "$expected_code" ]; then
    PASS=$((PASS + 1))
    echo "  ✅ $name (HTTP $actual_code)"
  else
    FAIL=$((FAIL + 1))
    echo "  ❌ $name — expected HTTP $expected_code, got $actual_code"
  fi
}

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  TINY STORE — Full E2E Smoke Test (Drizzle + PostgreSQL)"
echo "═══════════════════════════════════════════════════════════"

# ─── 1. Health Check ───
echo ""
echo "── 1. Health Check ──"
HEALTH=$(curl -s "$API/health")
test_case "Health endpoint" '"status":"OK"' "$HEALTH"

# ─── 2. Schema Provisioning ───
echo ""
echo "── 2. Schema Provisioning (trigger DB init) ──"
PRODUCT1=$(curl -s -X POST "$API/inventory/products" \
  -H "Content-Type: application/json" \
  -d '{"sku":"SMOKE-001","name":"Smoke Widget","stockQuantity":100}')
test_case "Create product" '"sku":"SMOKE-001"' "$PRODUCT1"
PRODUCT1_ID=$(echo "$PRODUCT1" | python3 -c "import sys,json; print(json.load(sys.stdin)['productId'])" 2>/dev/null)

SCHEMAS=$(docker exec tiny-store-postgres-1 psql -U tinystore -d tinystore -t -c "SELECT string_agg(schema_name, ',' ORDER BY schema_name) FROM information_schema.schemata WHERE schema_name IN ('inventory','orders','payments','shipments');")
test_case "All 4 schemas created" "inventory,orders,payments,shipments" "$SCHEMAS"

TABLES=$(docker exec tiny-store-postgres-1 psql -U tinystore -d tinystore -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema IN ('inventory','orders','payments','shipments','public') AND table_name IN ('products','stock_reservations','orders','payments','shipments','event_store');")
test_case "All 6 tables exist" "6" "$TABLES"

# ─── 3. Inventory CRUD ───
echo ""
echo "── 3. Inventory CRUD ──"
PRODUCT2=$(curl -s -X POST "$API/inventory/products" \
  -H "Content-Type: application/json" \
  -d '{"sku":"SMOKE-002","name":"Deluxe Widget","stockQuantity":50}')
test_case "Create second product" '"sku":"SMOKE-002"' "$PRODUCT2"

GET_P1=$(curl -s "$API/inventory/products/SMOKE-001")
test_case "Get product by SKU" '"stockQuantity":100' "$GET_P1"
test_case "Product has availableStock" '"availableStock":100' "$GET_P1"
test_case "Product status ACTIVE" '"status":"ACTIVE"' "$GET_P1"

# ─── 4. Happy Path: Full Order Lifecycle ───
echo ""
echo "── 4. Happy Path: Order → Reserve → Confirm → Pay → Ship ──"
ORDER1=$(curl -s -X POST "$API/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId":"cust-smoke-001",
    "items":[{"sku":"SMOKE-001","quantity":5,"unitPrice":19.99}],
    "shippingAddress":{"street":"1 Test Lane","city":"Testville","state":"TX","postalCode":"75001","country":"US"}
  }')
test_case "Place order" '"status":"PENDING"' "$ORDER1"
ORDER1_ID=$(echo "$ORDER1" | python3 -c "import sys,json; print(json.load(sys.stdin)['orderId'])" 2>/dev/null)
test_case "Order total correct" '"totalAmount":99.95' "$ORDER1"

sleep 2

GET_O1=$(curl -s "$API/orders/$ORDER1_ID")
test_case "Order reached SHIPPED" '"status":"SHIPPED"' "$GET_O1"
test_case "Order has paymentId" '"paymentId"' "$GET_O1"
test_case "Order has shipmentId" '"shipmentId"' "$GET_O1"

# ─── 5. Stock Reservation ───
echo ""
echo "── 5. Stock Reservation Verification ──"
GET_P1_AFTER=$(curl -s "$API/inventory/products/SMOKE-001")
test_case "Stock reserved (reservedQuantity > 0)" '"reservedQuantity":5' "$GET_P1_AFTER"
test_case "Available stock decreased" '"availableStock":95' "$GET_P1_AFTER"

DB_RESERVATIONS=$(docker exec tiny-store-postgres-1 psql -U tinystore -d tinystore -t -c "SELECT count(*) FROM inventory.stock_reservations WHERE order_id='$ORDER1_ID';")
test_case "DB: stock reservation exists" "1" "$DB_RESERVATIONS"

# ─── 6. Event Store ───
echo ""
echo "── 6. Event Store (full event chain) ──"
EVENTS=$(curl -s "$API/events")
EVENTS_FOR_ORDER=$(echo "$EVENTS" | python3 -c "
import sys,json
data = json.load(sys.stdin)
types = [e['eventType'] for e in data['events'] if e['aggregateId'] == '$ORDER1_ID' or e.get('payload',{}).get('orderId') == '$ORDER1_ID']
print(','.join(sorted(set(types))))
" 2>/dev/null)
test_case "OrderPlaced event" "OrderPlaced" "$EVENTS_FOR_ORDER"
test_case "InventoryReserved event" "InventoryReserved" "$EVENTS_FOR_ORDER"
test_case "OrderConfirmed event" "OrderConfirmed" "$EVENTS_FOR_ORDER"
test_case "PaymentProcessed event" "PaymentProcessed" "$EVENTS_FOR_ORDER"
test_case "OrderPaid event" "OrderPaid" "$EVENTS_FOR_ORDER"
test_case "ShipmentCreated event" "ShipmentCreated" "$EVENTS_FOR_ORDER"
test_case "OrderShipped event" "OrderShipped" "$EVENTS_FOR_ORDER"

DB_EVENT_COUNT=$(docker exec tiny-store-postgres-1 psql -U tinystore -d tinystore -t -c "SELECT count(*) FROM public.event_store WHERE aggregate_id='$ORDER1_ID' OR payload->>'orderId'='$ORDER1_ID';")
test_case "DB: 7 events for order" "7" "$DB_EVENT_COUNT"

# ─── 7. Second Order (different product) ───
echo ""
echo "── 7. Second Order (concurrent product) ──"
ORDER2=$(curl -s -X POST "$API/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId":"cust-smoke-002",
    "items":[{"sku":"SMOKE-002","quantity":3,"unitPrice":49.99}],
    "shippingAddress":{"street":"2 Test Ave","city":"Testburg","state":"CA","postalCode":"90001","country":"US"}
  }')
test_case "Second order placed" '"status":"PENDING"' "$ORDER2"
ORDER2_ID=$(echo "$ORDER2" | python3 -c "import sys,json; print(json.load(sys.stdin)['orderId'])" 2>/dev/null)

sleep 2

GET_O2=$(curl -s "$API/orders/$ORDER2_ID")
test_case "Second order SHIPPED" '"status":"SHIPPED"' "$GET_O2"

GET_P2=$(curl -s "$API/inventory/products/SMOKE-002")
test_case "Second product stock reserved" '"reservedQuantity":3' "$GET_P2"
test_case "Second product available" '"availableStock":47' "$GET_P2"

# ─── 8. List Operations ───
echo ""
echo "── 8. List Operations ──"
LIST_ORDERS=$(curl -s "$API/orders")
ORDER_COUNT=$(echo "$LIST_ORDERS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['orders']))" 2>/dev/null)
test_case "List orders returns 2" "2" "$ORDER_COUNT"

EVENTS_ALL=$(curl -s "$API/events")
EVENT_COUNT=$(echo "$EVENTS_ALL" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['events']))" 2>/dev/null)
TOTAL=$((TOTAL + 1))
if [ "$EVENT_COUNT" -ge 14 ]; then
  PASS=$((PASS + 1))
  echo "  ✅ Event store has ≥14 events ($EVENT_COUNT)"
else
  FAIL=$((FAIL + 1))
  echo "  ❌ Event store has <14 events ($EVENT_COUNT)"
fi

# ─── 9. Error Handling ───
echo ""
echo "── 9. Error Handling ──"
NOT_FOUND_ORDER=$(curl -s -o /dev/null -w "%{http_code}" "$API/orders/nonexistent-id")
test_status "404 for missing order" "404" "$NOT_FOUND_ORDER"

NOT_FOUND_PRODUCT=$(curl -s -o /dev/null -w "%{http_code}" "$API/inventory/products/FAKE-SKU")
test_status "404 for missing product" "404" "$NOT_FOUND_PRODUCT"

CANNOT_CANCEL=$(curl -s -X POST "$API/orders/$ORDER1_ID/cancel" \
  -H "Content-Type: application/json" \
  -d '{"reason":"test"}')
test_case "Cannot cancel SHIPPED order" "Cannot cancel order" "$CANNOT_CANCEL"

# ─── 10. DB Data Integrity ───
echo ""
echo "── 10. Database Integrity (direct SQL) ──"
DB_ORDERS=$(docker exec tiny-store-postgres-1 psql -U tinystore -d tinystore -t -c "SELECT count(*) FROM orders.orders;")
test_case "DB: 2 orders" "2" "$DB_ORDERS"

DB_PAYMENTS=$(docker exec tiny-store-postgres-1 psql -U tinystore -d tinystore -t -c "SELECT count(*) FROM payments.payments WHERE status='SUCCEEDED';")
test_case "DB: 2 successful payments" "2" "$DB_PAYMENTS"

DB_SHIPMENTS=$(docker exec tiny-store-postgres-1 psql -U tinystore -d tinystore -t -c "SELECT count(*) FROM shipments.shipments;")
test_case "DB: 2 shipments" "2" "$DB_SHIPMENTS"

DB_PRODUCTS=$(docker exec tiny-store-postgres-1 psql -U tinystore -d tinystore -t -c "SELECT count(*) FROM inventory.products;")
test_case "DB: 2 products" "2" "$DB_PRODUCTS"

# Numeric precision check
DB_AMOUNT=$(docker exec tiny-store-postgres-1 psql -U tinystore -d tinystore -t -c "SELECT total_amount FROM orders.orders WHERE id='$ORDER1_ID';")
test_case "DB: numeric precision (99.95)" "99.95" "$DB_AMOUNT"

# Cross-schema foreign key equivalent check
DB_PAYMENT_MATCH=$(docker exec tiny-store-postgres-1 psql -U tinystore -d tinystore -t -c "SELECT count(*) FROM payments.payments p WHERE p.order_id IN (SELECT id FROM orders.orders);")
test_case "DB: all payments match orders" "2" "$DB_PAYMENT_MATCH"

DB_SHIPMENT_MATCH=$(docker exec tiny-store-postgres-1 psql -U tinystore -d tinystore -t -c "SELECT count(*) FROM shipments.shipments s WHERE s.order_id IN (SELECT id FROM orders.orders);")
test_case "DB: all shipments match orders" "2" "$DB_SHIPMENT_MATCH"

# ─── 11. Multi-item Order ───
echo ""
echo "── 11. Multi-item Order ──"
ORDER3=$(curl -s -X POST "$API/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId":"cust-smoke-003",
    "items":[
      {"sku":"SMOKE-001","quantity":2,"unitPrice":19.99},
      {"sku":"SMOKE-002","quantity":1,"unitPrice":49.99}
    ],
    "shippingAddress":{"street":"3 Multi St","city":"Testham","state":"NY","postalCode":"10001","country":"US"}
  }')
test_case "Multi-item order placed" '"status":"PENDING"' "$ORDER3"
ORDER3_TOTAL=$(echo "$ORDER3" | python3 -c "import sys,json; print(json.load(sys.stdin)['totalAmount'])" 2>/dev/null)
test_case "Multi-item total correct (89.97)" "89.97" "$ORDER3_TOTAL"

sleep 2

ORDER3_ID=$(echo "$ORDER3" | python3 -c "import sys,json; print(json.load(sys.stdin)['orderId'])" 2>/dev/null)
GET_O3=$(curl -s "$API/orders/$ORDER3_ID")
test_case "Multi-item order SHIPPED" '"status":"SHIPPED"' "$GET_O3"

# ─── 12. Stock Exhaustion (Insufficient Stock) ───
echo ""
echo "── 12. Insufficient Stock → Order Rejection ──"
# SMOKE-001 started at 100, reserved 5+2=7, so 93 available
ORDER4=$(curl -s -X POST "$API/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId":"cust-smoke-004",
    "items":[{"sku":"SMOKE-001","quantity":200,"unitPrice":19.99}],
    "shippingAddress":{"street":"4 Broke Rd","city":"Failtown","state":"FL","postalCode":"33101","country":"US"}
  }')
ORDER4_ID=$(echo "$ORDER4" | python3 -c "import sys,json; print(json.load(sys.stdin)['orderId'])" 2>/dev/null)

sleep 2

GET_O4=$(curl -s "$API/orders/$ORDER4_ID")
ORDER4_STATUS=$(echo "$GET_O4" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
test_case "Oversized order REJECTED" "REJECTED" "$ORDER4_STATUS"

# ─── Summary ───
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  RESULTS: $PASS passed / $FAIL failed / $TOTAL total"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
