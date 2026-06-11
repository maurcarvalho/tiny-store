/**
 * Exercise G1-1: Cross-Module Direct Import
 *
 * This is a modified version of place-order/service.ts that imports
 * ProductRepository directly from the Inventory module's internals
 * instead of communicating through the EventBus.
 *
 * WHY THIS VIOLATES G1:
 * - Undeclared Dependencies metric increases: Orders depends on Inventory's
 *   internal repository, which is not part of Inventory's public API.
 * - The boundary rule states modules can only import from shared/* libraries.
 *   Module-to-module imports are forbidden — all cross-module communication
 *   must go through the EventBus.
 * - ESLint @nx/enforce-module-boundaries would catch this at lint time
 *   (type:module can only depend on type:shared).
 *
 * DETECTION:
 * - `nx lint` → @nx/enforce-module-boundaries violation
 * - Undeclared Dependencies count > 0
 * - Forbidden Dependencies count > 0 (if boundary rules use `forbids`)
 *
 * RESOLUTION: Remove the direct import. Use the existing event chain:
 * PlaceOrderService publishes OrderPlaced → Inventory's OrderPlacedListener
 * handles stock reservation → publishes InventoryReserved/InventoryReservationFailed
 * → Orders listens and reacts.
 */

import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import { EventBus } from '@tiny-store/shared-infrastructure';
import { Address, Money } from '@tiny-store/shared-domain';

// ❌ VIOLATION: direct import from another module's internal repository
import { ProductRepository } from '@tiny-store/modules-inventory/internal';

// Correct imports (from own module)
import { OrderRepository } from '../../domain/repositories/order.repository';
import { Order } from '../../domain/entities/order';
import { CustomerId } from '../../domain/value-objects/customer-id.value-object';
import { OrderItem } from '../../domain/value-objects/order-item.value-object';

interface PlaceOrderDto {
  customerId: string;
  items: Array<{ sku: string; quantity: number; unitPrice: number }>;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export class PlaceOrderServiceWithDirectImport {
  private orderRepository: OrderRepository;
  private eventBus: EventBus;

  // ❌ VIOLATION: holding a reference to another module's repository
  private productRepository: ProductRepository;

  constructor(db: DrizzleDb) {
    this.orderRepository = new OrderRepository(db);
    this.eventBus = EventBus.getInstance();

    // ❌ VIOLATION: instantiating another module's internal class
    this.productRepository = new ProductRepository(db);
  }

  async execute(dto: PlaceOrderDto): Promise<void> {
    // ❌ VIOLATION: checking stock by calling Inventory repo directly
    // instead of trusting the event-driven reservation flow
    for (const item of dto.items) {
      const product = await this.productRepository.findBySku(item.sku);
      if (!product || product.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for SKU ${item.sku}`);
      }
    }

    const customerId = CustomerId.create(dto.customerId);
    const items = dto.items.map((item) =>
      OrderItem.create(item.sku, item.quantity, Money.create(item.unitPrice))
    );
    const address = Address.create(
      dto.shippingAddress.street,
      dto.shippingAddress.city,
      dto.shippingAddress.state,
      dto.shippingAddress.postalCode,
      dto.shippingAddress.country
    );

    const order = Order.create(customerId, items, address);
    await this.orderRepository.save(order);

    // The event is still published, but the damage is done:
    // this service has a compile-time + runtime dependency on Inventory
  }
}
