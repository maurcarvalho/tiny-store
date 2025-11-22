/**
 * E2E Test Helpers - Polling Utilities
 * 
 * Robust polling utilities for handling asynchronous workflows in E2E tests.
 * These utilities eliminate test flakiness by waiting for actual conditions
 * rather than using arbitrary delays.
 */

import * as http from 'http';

/**
 * Configuration for timeout profiles based on environment
 */
export interface TimeoutProfile {
  /** Default maximum wait time in milliseconds */
  defaultMaxWait: number;
  /** Default polling interval in milliseconds */
  defaultPollInterval: number;
  /** Timeout for order state transitions */
  orderTransition: number;
  /** Timeout for inventory updates */
  inventoryUpdate: number;
  /** Timeout for event propagation */
  eventPropagation: number;
  /** Timeout for complex workflows */
  complexWorkflow: number;
}

/**
 * Predefined timeout profiles
 */
export const TimeoutProfiles: Record<string, TimeoutProfile> = {
  local: {
    defaultMaxWait: 5000,
    defaultPollInterval: 100,
    orderTransition: 10000,
    inventoryUpdate: 5000,
    eventPropagation: 3000,
    complexWorkflow: 15000,
  },
  ci: {
    defaultMaxWait: 10000,
    defaultPollInterval: 200,
    orderTransition: 20000,
    inventoryUpdate: 10000,
    eventPropagation: 6000,
    complexWorkflow: 30000,
  },
  development: {
    defaultMaxWait: 3000,
    defaultPollInterval: 50,
    orderTransition: 8000,
    inventoryUpdate: 3000,
    eventPropagation: 2000,
    complexWorkflow: 12000,
  },
};

/**
 * Get timeout profile based on environment
 */
export function getTimeoutProfile(): TimeoutProfile {
  const env = process.env.NODE_ENV || 'local';
  const isCI = process.env.CI === 'true';
  
  if (isCI) return TimeoutProfiles.ci;
  if (env === 'development') return TimeoutProfiles.development;
  return TimeoutProfiles.local;
}

/**
 * Current active timeout profile
 */
let activeProfile = getTimeoutProfile();

/**
 * Set custom timeout profile (useful for testing)
 */
export function setTimeoutProfile(profile: TimeoutProfile | 'local' | 'ci' | 'development'): void {
  if (typeof profile === 'string') {
    activeProfile = TimeoutProfiles[profile];
  } else {
    activeProfile = profile;
  }
}

/**
 * Metrics for polling operations
 */
export interface PollingMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  pollAttempts: number;
  success: boolean;
  error?: string;
}

/**
 * Metrics collector
 */
class MetricsCollector {
  private metrics: PollingMetrics[] = [];
  private enabled: boolean = false;

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  record(metric: PollingMetrics): void {
    if (this.enabled) {
      this.metrics.push(metric);
    }
  }

  getMetrics(): PollingMetrics[] {
    return [...this.metrics];
  }

  clear(): void {
    this.metrics = [];
  }

  getSummary(): {
    totalOperations: number;
    successRate: number;
    averageDuration: number;
    averagePollAttempts: number;
    operationBreakdown: Record<string, { count: number; avgDuration: number }>;
  } {
    if (this.metrics.length === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        averageDuration: 0,
        averagePollAttempts: 0,
        operationBreakdown: {},
      };
    }

    const successCount = this.metrics.filter(m => m.success).length;
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const totalAttempts = this.metrics.reduce((sum, m) => sum + m.pollAttempts, 0);

    const operationBreakdown: Record<string, { count: number; totalDuration: number }> = {};
    
    this.metrics.forEach(m => {
      if (!operationBreakdown[m.operation]) {
        operationBreakdown[m.operation] = { count: 0, totalDuration: 0 };
      }
      operationBreakdown[m.operation].count++;
      operationBreakdown[m.operation].totalDuration += m.duration;
    });

    const breakdown: Record<string, { count: number; avgDuration: number }> = {};
    Object.entries(operationBreakdown).forEach(([op, data]) => {
      breakdown[op] = {
        count: data.count,
        avgDuration: Math.round(data.totalDuration / data.count),
      };
    });

    return {
      totalOperations: this.metrics.length,
      successRate: Math.round((successCount / this.metrics.length) * 100),
      averageDuration: Math.round(totalDuration / this.metrics.length),
      averagePollAttempts: Math.round(totalAttempts / this.metrics.length),
      operationBreakdown: breakdown,
    };
  }
}

export const pollingMetrics = new MetricsCollector();

/**
 * Options for waitUntil function
 */
export interface WaitUntilOptions {
  /** Maximum wait time in milliseconds */
  maxWaitMs?: number;
  /** Polling interval in milliseconds */
  pollIntervalMs?: number;
  /** Custom error message */
  errorMessage?: string;
  /** Operation name for metrics */
  operationName?: string;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generic polling utility - polls until condition is met or timeout
 * 
 * @param conditionFn - Function that returns truthy value when condition is met
 * @param options - Configuration options
 * @returns The result from conditionFn when condition is met
 * @throws Error if timeout is reached
 */
export async function waitUntil<T>(
  conditionFn: () => Promise<T | null | undefined | false>,
  options: WaitUntilOptions = {}
): Promise<T> {
  const {
    maxWaitMs = activeProfile.defaultMaxWait,
    pollIntervalMs = activeProfile.defaultPollInterval,
    errorMessage = 'Condition not met within timeout',
    operationName = 'waitUntil',
  } = options;
  
  const startTime = Date.now();
  let lastError: Error | null = null;
  let pollAttempts = 0;
  
  while (Date.now() - startTime < maxWaitMs) {
    pollAttempts++;
    try {
      const result = await conditionFn();
      if (result) {
        // Record success metrics
        pollingMetrics.record({
          operation: operationName,
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime,
          pollAttempts,
          success: true,
        });
        return result;
      }
    } catch (error) {
      lastError = error as Error;
    }
    await sleep(pollIntervalMs);
  }
  
  // Record failure metrics
  const finalError = `${errorMessage} (waited ${maxWaitMs}ms, ${pollAttempts} attempts). Last error: ${lastError?.message || 'none'}`;
  pollingMetrics.record({
    operation: operationName,
    startTime,
    endTime: Date.now(),
    duration: Date.now() - startTime,
    pollAttempts,
    success: false,
    error: finalError,
  });
  
  throw new Error(finalError);
}

/**
 * HTTP request helper for E2E tests
 */
export interface HttpResponse<T = any> {
  status: number;
  data: T;
}

export async function request<T = any>(
  method: string,
  path: string,
  body?: any,
  baseUrl: string = 'http://localhost:3000'
): Promise<HttpResponse<T>> {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('/api') ? path : `/api${path}`, baseUrl);
    
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode || 500,
            data: JSON.parse(data),
          });
        } catch (e) {
          resolve({
            status: res.statusCode || 500,
            data: data as any,
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Wait for order to reach specific status
 * 
 * @param orderId - Order ID to check
 * @param expectedStatus - Expected order status
 * @param maxWaitMs - Maximum wait time (uses profile default if not specified)
 * @returns Order data when status is reached
 */
export async function waitForOrderStatus(
  orderId: string,
  expectedStatus: string,
  maxWaitMs?: number
): Promise<any> {
  return waitUntil(
    async () => {
      const response = await request('GET', `/orders/${orderId}`);
      if (response.data.status === expectedStatus) {
        return response.data;
      }
      return null;
    },
    {
      maxWaitMs: maxWaitMs || activeProfile.orderTransition,
      errorMessage: `Order ${orderId} did not reach status ${expectedStatus}`,
      operationName: `waitForOrderStatus:${expectedStatus}`,
    }
  );
}

/**
 * Wait for specific inventory state
 * 
 * @param sku - Product SKU
 * @param expectedState - Expected inventory state
 * @param maxWaitMs - Maximum wait time (uses profile default if not specified)
 * @returns Product data when state is reached
 */
export async function waitForInventoryState(
  sku: string,
  expectedState: { reserved: number; available: number },
  maxWaitMs?: number
): Promise<any> {
  let lastState: { reserved: number; available: number } | null = null;
  
  return waitUntil(
    async () => {
      try {
        const response = await request('GET', `/inventory/products/${sku}`);
        if (!response.data) {
          return null;
        }
        
        lastState = {
          reserved: response.data.reservedQuantity ?? -1,
          available: response.data.availableStock ?? -1
        };
        
        const matches = 
          response.data.reservedQuantity === expectedState.reserved &&
          response.data.availableStock === expectedState.available;
        
        if (matches) {
          return response.data;
        }
        return null;
      } catch (error) {
        return null;
      }
    },
    {
      maxWaitMs: maxWaitMs || activeProfile.inventoryUpdate,
      pollIntervalMs: 100,
      errorMessage: `Product ${sku} did not reach expected state (reserved: ${expectedState.reserved}, available: ${expectedState.available}). Last seen: reserved=${lastState?.reserved}, available=${lastState?.available}`,
      operationName: 'waitForInventoryState',
    }
  );
}

/**
 * Wait for specific event to appear
 * 
 * @param orderId - Order ID to filter events
 * @param eventType - Expected event type
 * @param maxWaitMs - Maximum wait time (uses profile default if not specified)
 * @returns Events data when event is found
 */
export async function waitForEvent(
  orderId: string,
  eventType: string,
  maxWaitMs?: number
): Promise<any> {
  return waitUntil(
    async () => {
      const response = await request('GET', `/events?orderId=${orderId}`);
      const event = response.data.events.find((e: any) => e.eventType === eventType);
      if (event) {
        return response.data;
      }
      return null;
    },
    {
      maxWaitMs: maxWaitMs || activeProfile.eventPropagation,
      errorMessage: `Event ${eventType} not found for order ${orderId}`,
      operationName: `waitForEvent:${eventType}`,
    }
  );
}

/**
 * Predicate function for event matching
 */
export type EventPredicate = (event: any) => boolean;

/**
 * Generic event waiter that matches events using a predicate function
 * 
 * @param predicate - Function to test if event matches criteria
 * @param options - Configuration options
 * @returns First event that matches the predicate
 * 
 * @example
 * // Wait for any order event
 * await waitForEventMatching(e => e.aggregateType === 'Order');
 * 
 * @example
 * // Wait for high-value orders
 * await waitForEventMatching(
 *   e => e.eventType === 'OrderPlaced' && e.payload.totalAmount > 1000
 * );
 */
export async function waitForEventMatching(
  predicate: EventPredicate,
  options: WaitUntilOptions & { orderId?: string } = {}
): Promise<any> {
  const { orderId, ...waitOptions } = options;
  
  return waitUntil(
    async () => {
      const path = orderId ? `/events?orderId=${orderId}` : '/events';
      const response = await request('GET', path);
      const matchedEvent = response.data.events.find(predicate);
      
      if (matchedEvent) {
        return matchedEvent;
      }
      return null;
    },
    {
      maxWaitMs: activeProfile.eventPropagation,
      ...waitOptions,
      errorMessage: waitOptions.errorMessage || 'Event matching predicate not found',
      operationName: 'waitForEventMatching',
    }
  );
}

/**
 * Wait for multiple events to appear
 * 
 * @param eventTypes - Array of event types to wait for
 * @param options - Configuration options
 * @returns Events data when all events are found
 */
export async function waitForEvents(
  eventTypes: string[],
  options: WaitUntilOptions & { orderId?: string } = {}
): Promise<any> {
  const { orderId, ...waitOptions } = options;
  
  return waitUntil(
    async () => {
      const path = orderId ? `/events?orderId=${orderId}` : '/events';
      const response = await request('GET', path);
      const foundEventTypes = response.data.events.map((e: any) => e.eventType);
      
      const allFound = eventTypes.every(type => foundEventTypes.includes(type));
      
      if (allFound) {
        return response.data;
      }
      return null;
    },
    {
      maxWaitMs: activeProfile.eventPropagation,
      ...waitOptions,
      errorMessage: waitOptions.errorMessage || `Events ${eventTypes.join(', ')} not all found`,
      operationName: `waitForEvents:${eventTypes.length}`,
    }
  );
}

/**
 * Retry a function until it succeeds or max attempts reached
 * 
 * @param fn - Function to retry
 * @param maxAttempts - Maximum number of attempts
 * @param delayMs - Delay between attempts
 * @returns Result from successful attempt
 * @throws Last error if all attempts fail
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await sleep(delayMs);
      }
    }
  }
  
  throw lastError!;
}

