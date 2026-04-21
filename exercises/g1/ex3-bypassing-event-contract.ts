/**
 * Exercise G1-3: Bypassing Event Contract (Direct Service Call)
 *
 * This shows an Orders listener that, instead of publishing a domain event
 * for Payments to react to, directly calls the ProcessPaymentService from
 * the Payments module. This bypasses the event contract and creates a
 * hidden, undeclared dependency between modules.
 *
 * WHY THIS VIOLATES G1:
 * - Forbidden Dependencies count increases: Orders directly calls Payments'
 *   internal service, violating the rule that modules communicate only
 *   through events.
 * - The EventBus contract is the module's published interface. Bypassing
 *   it means changes in Payments' service signature silently break Orders.
 * - The boundary enforcement in register-listeners.ts is undermined:
 *   if Orders is extracted, this direct call has no event trail to replay.
 *
 * DETECTION:
 * - Forbidden Dependencies count > 0
 * - Event Violations count > 0 (cross-module call without event)
 * - Missing event in EventStore for the payment trigger
 *
 * RESOLUTION: The listener should publish an OrderConfirmed event.
 * Payments' OrderConfirmedListener reacts by calling ProcessPaymentService
 * internally. The event contract is the only coupling between modules.
 */

import type { DrizzleDb } from '@tiny-store/shared-infrastructure';
import type { DomainEvent } from '@tiny-store/shared-infrastructure';

// ❌ VIOLATION: importing a service from another module
import { ProcessPaymentHandler } from '@tiny-store/modules-payments';

/**
 * This listener handles InventoryReserved and directly calls the
 * Payments module to process payment — skipping the event contract.
 */
export class InventoryReservedListenerWithDirectCall {
  // ❌ VIOLATION: holding a direct reference to another module's handler
  private processPaymentHandler: ProcessPaymentHandler;

  constructor(db: DrizzleDb) {
    this.processPaymentHandler = new ProcessPaymentHandler(db);
  }

  async handle(event: DomainEvent): Promise<void> {
    const payload = event.payload as {
      orderId: string;
      totalAmount: number;
    };

    // ❌ VIOLATION: direct call instead of publishing OrderConfirmed event
    // This creates an invisible dependency: Orders → Payments
    // No event is stored in the EventStore for this interaction
    await this.processPaymentHandler.handle({
      orderId: payload.orderId,
      amount: payload.totalAmount,
    });

    // What should happen instead:
    //
    // const confirmEvent = createOrderConfirmedEvent(payload.orderId, {
    //   orderId: payload.orderId,
    //   totalAmount: payload.totalAmount,
    // });
    // await this.eventBus.publish(confirmEvent);
    //
    // Then Payments' OrderConfirmedListener handles payment processing
    // internally, maintaining the event contract.
  }
}
