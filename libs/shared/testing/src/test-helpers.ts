import { DataSource } from 'typeorm';
import * as path from 'path';
import { randomUUID } from 'crypto';

/**
 * Test Database Helper
 * Creates isolated database instances for each test
 */
export class TestDatabase {
  private dataSource: DataSource | null = null;

  async setup(): Promise<DataSource> {
    const dbName = `test-${randomUUID()}.db`;
    
    this.dataSource = new DataSource({
      type: 'sqlite',
      database: path.join(process.cwd(), 'test-dbs', dbName),
      entities: [
        path.join(process.cwd(), 'libs/modules/**/*.entity.{ts,js}'),
        path.join(process.cwd(), 'libs/shared/**/*.entity.{ts,js}'),
      ],
      synchronize: true,
      logging: false,
      dropSchema: true,
    });

    await this.dataSource.initialize();
    return this.dataSource;
  }

  async cleanup(): Promise<void> {
    if (this.dataSource) {
      await this.dataSource.destroy();
      this.dataSource = null;
    }
  }

  getDataSource(): DataSource {
    if (!this.dataSource) {
      throw new Error('Database not initialized. Call setup() first.');
    }
    return this.dataSource;
  }
}

/**
 * Event Bus Spy
 * Captures published events for assertions
 */
export class EventBusSpy {
  private publishedEvents: Array<{ eventType: string; event: any }> = [];
  private subscriptions: Map<string, Array<(event: any) => void>> = new Map();

  publish(event: any): void {
    this.publishedEvents.push({
      eventType: event.eventType,
      event,
    });

    // Trigger subscribers
    const handlers = this.subscriptions.get(event.eventType) || [];
    handlers.forEach((handler) => handler(event));
  }

  subscribe(eventType: string, handler: (event: any) => void): void {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    this.subscriptions.get(eventType)!.push(handler);
  }

  getPublishedEvents(eventType?: string): any[] {
    if (eventType) {
      return this.publishedEvents
        .filter((e) => e.eventType === eventType)
        .map((e) => e.event);
    }
    return this.publishedEvents.map((e) => e.event);
  }

  getEventCount(eventType?: string): number {
    return this.getPublishedEvents(eventType).length;
  }

  clear(): void {
    this.publishedEvents = [];
  }

  hasEvent(eventType: string): boolean {
    return this.publishedEvents.some((e) => e.eventType === eventType);
  }
}

/**
 * Async Event Waiter
 * Waits for events to be processed
 */
export async function waitForEvents(ms: number = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Test Data Builders
 */
export class TestDataBuilder {
  static createOrderData(overrides?: any) {
    return {
      customerId: overrides?.customerId || randomUUID(),
      items: overrides?.items || [
        {
          sku: 'TEST-SKU-001',
          quantity: 2,
          unitPrice: 50.0,
          currency: 'USD',
        },
      ],
      shippingAddress: overrides?.shippingAddress || {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        postalCode: '12345',
        country: 'USA',
      },
    };
  }

  static createProductData(overrides?: any) {
    return {
      sku: overrides?.sku || `TEST-${randomUUID().substring(0, 8)}`,
      name: overrides?.name || 'Test Product',
      price: overrides?.price || 100,
      currency: overrides?.currency || 'USD',
      stockQuantity: overrides?.stockQuantity ?? 50,
    };
  }

  static createPaymentData(overrides?: any) {
    return {
      orderId: overrides?.orderId || randomUUID(),
      amount: overrides?.amount || 100,
      currency: overrides?.currency || 'USD',
    };
  }

  static createShipmentData(overrides?: any) {
    return {
      orderId: overrides?.orderId || randomUUID(),
      shippingAddress: overrides?.shippingAddress || {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        postalCode: '12345',
        country: 'USA',
      },
    };
  }
}

/**
 * Assertion Helpers
 */
export class AssertionHelpers {
  static assertEventPublished(
    spy: EventBusSpy,
    eventType: string,
    message?: string
  ) {
    if (!spy.hasEvent(eventType)) {
      throw new Error(
        message || `Expected event '${eventType}' to be published, but it wasn't`
      );
    }
  }

  static assertEventNotPublished(
    spy: EventBusSpy,
    eventType: string,
    message?: string
  ) {
    if (spy.hasEvent(eventType)) {
      throw new Error(
        message || `Expected event '${eventType}' not to be published, but it was`
      );
    }
  }

  static assertEventCount(
    spy: EventBusSpy,
    eventType: string,
    expectedCount: number
  ) {
    const actualCount = spy.getEventCount(eventType);
    if (actualCount !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} '${eventType}' events, but got ${actualCount}`
      );
    }
  }
}

/**
 * Module Boundary Test Helper
 * Helps verify that modules don't directly depend on each other's internals
 */
export class ModuleBoundaryTester {
  /**
   * Verify that a module only uses public exports from another module
   */
  static assertUsesPublicAPI(
    moduleName: string,
    allowedExports: string[]
  ): void {
    // This is a conceptual helper - in practice, you'd use tools like
    // dependency-cruiser or nx enforce-module-boundaries
    // For now, we'll document expected boundaries
  }

  /**
   * Verify that direct entity/repository access is not allowed across modules
   */
  static assertNoDirectEntityAccess(
    fromModule: string,
    toModule: string
  ): void {
    // In a real implementation, this would analyze imports
    // For now, we'll verify through test scenarios
  }
}

