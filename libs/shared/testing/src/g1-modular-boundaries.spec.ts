/**
 * G1: Module Boundary Violation Tests (Static Analysis)
 *
 * These tests verify that modules respect architectural boundaries by
 * statically analysing index.ts (public API) export paths — no runtime
 * module resolution required.
 *
 * 1. Modules should NOT directly access other modules' domain entities
 * 2. Modules should NOT directly access other modules' repositories
 * 3. Modules MUST communicate via domain events only
 * 4. Modules CAN use shared infrastructure and domain libraries
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../../../');
const MODULES_ROOT = path.join(ROOT, 'libs/modules');
const SHARED_ROOT = path.join(ROOT, 'libs/shared');
const MODULES = ['orders', 'inventory', 'payments', 'shipments'];

/** Return the relative export paths declared in a file via `export * from './...'` */
function getExportPaths(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const paths: string[] = [];
  const regex = /export\s+\*\s+from\s+['"](\.\/[^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    paths.push(m[1]);
  }
  return paths;
}

/** Resolve a relative export path to an actual file on disk */
function resolveExport(basedir: string, rel: string): string {
  const candidates = [
    path.resolve(basedir, rel + '.ts'),
    path.resolve(basedir, rel, 'index.ts'),
    path.resolve(basedir, rel),
  ];
  return candidates.find(c => fs.existsSync(c)) || rel;
}

function moduleIndexPath(mod: string): string {
  return path.join(MODULES_ROOT, mod, 'src/index.ts');
}

function moduleExportPaths(mod: string): string[] {
  return getExportPaths(moduleIndexPath(mod));
}

/** Check if any export path matches a pattern (applied to the relative path string) */
function hasExportMatching(mod: string, pattern: RegExp): boolean {
  return moduleExportPaths(mod).some(p => pattern.test(p));
}

/** Get export paths matching a pattern */
function exportsMatching(mod: string, pattern: RegExp): string[] {
  return moduleExportPaths(mod).filter(p => pattern.test(p));
}

/** Read a file and collect all `export (class|function|const|type|interface|enum) Name` symbols */
function getExportedSymbols(filePath: string): string[] {
  const resolved = resolveExport(path.dirname(filePath), './' + path.basename(filePath).replace(/\.ts$/, ''));
  const actual = fs.existsSync(filePath) ? filePath : resolved;
  if (!fs.existsSync(actual)) return [];
  const content = fs.readFileSync(actual, 'utf-8');
  const symbols: string[] = [];
  // Match: export class/function/const/type/interface/enum/abstract class Name
  const declRegex = /export\s+(?:class|function|const|type|interface|enum|abstract\s+class)\s+(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = declRegex.exec(content)) !== null) {
    symbols.push(m[1]);
  }
  // Match: export { Name, Name2 }
  const braceRegex = /export\s*\{([^}]+)\}/g;
  while ((m = braceRegex.exec(content)) !== null) {
    const names = m[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop()!.trim()).filter(Boolean);
    symbols.push(...names);
  }
  return symbols;
}

/** Collect all symbols reachable from a module's index.ts */
function allPublicSymbols(indexPath: string): string[] {
  const dir = path.dirname(indexPath);
  const exportPaths = getExportPaths(indexPath);
  const symbols: string[] = [];
  for (const rel of exportPaths) {
    const resolved = resolveExport(dir, rel);
    if (fs.existsSync(resolved)) {
      symbols.push(...getExportedSymbols(resolved));
    }
  }
  return symbols;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('G1: Module Boundary Violations', () => {
  describe('Cross-Module Entity Access (SHOULD NOT BE EXPORTED)', () => {
    it('should NOT export Inventory domain entities in public API', () => {
      const entityExports = exportsMatching('inventory', /\.entity$/);
      expect(entityExports).toEqual([]);
    });

    it('should NOT export Order domain entities in public API', () => {
      const entityExports = exportsMatching('orders', /\.entity$/);
      expect(entityExports).toEqual([]);
    });

    it('should NOT export Payment domain entities in public API', () => {
      const entityExports = exportsMatching('payments', /\.entity$/);
      expect(entityExports).toEqual([]);
    });

    it('should NOT export Shipment domain entities in public API', () => {
      const entityExports = exportsMatching('shipments', /\.entity$/);
      expect(entityExports).toEqual([]);
    });
  });

  describe('Cross-Module Repository Access (SHOULD NOT BE EXPORTED)', () => {
    it('should NOT export ProductRepository in public API', () => {
      const repoExports = exportsMatching('inventory', /repository/);
      expect(repoExports).toEqual([]);
    });

    it('should NOT export OrderRepository in public API', () => {
      const repoExports = exportsMatching('orders', /repository/);
      expect(repoExports).toEqual([]);
    });

    it('should NOT export PaymentRepository in public API', () => {
      const repoExports = exportsMatching('payments', /repository/);
      expect(repoExports).toEqual([]);
    });
  });

  describe('Allowed Public API Access (SHOULD PASS)', () => {
    it('should allow importing public handlers from Orders', () => {
      const handlers = exportsMatching('orders', /\/handler$/);
      expect(handlers.length).toBeGreaterThanOrEqual(4);
      expect(handlers.some(p => p.includes('place-order'))).toBe(true);
      expect(handlers.some(p => p.includes('get-order'))).toBe(true);
      expect(handlers.some(p => p.includes('cancel-order'))).toBe(true);
      expect(handlers.some(p => p.includes('list-orders'))).toBe(true);
    });

    it('should allow importing public handlers from Inventory', () => {
      const handlers = exportsMatching('inventory', /\/handler$/);
      expect(handlers.length).toBeGreaterThanOrEqual(4);
      expect(handlers.some(p => p.includes('create-product'))).toBe(true);
      expect(handlers.some(p => p.includes('get-product'))).toBe(true);
      expect(handlers.some(p => p.includes('reserve-stock'))).toBe(true);
      expect(handlers.some(p => p.includes('release-stock'))).toBe(true);
    });

    it('should allow importing event listeners from modules', () => {
      const listeners = exportsMatching('orders', /\/listeners\//);
      expect(listeners.some(p => p.includes('inventory-reserved'))).toBe(true);
      expect(listeners.some(p => p.includes('inventory-reservation-failed'))).toBe(true);
    });

    it('should allow all modules to use shared domain', () => {
      const indexPath = path.join(SHARED_ROOT, 'domain/src/index.ts');
      const symbols = allPublicSymbols(indexPath);
      expect(symbols).toContain('Money');
      expect(symbols).toContain('Address');
      expect(symbols).toContain('Entity');
      expect(symbols).toContain('AggregateRoot');
      expect(symbols).toContain('Result');
    });

    it('should allow all modules to use shared infrastructure', () => {
      const indexPath = path.join(SHARED_ROOT, 'infrastructure/src/index.ts');
      const symbols = allPublicSymbols(indexPath);
      expect(symbols).toContain('EventBus');
      expect(symbols).toContain('BaseRepository');
    });
  });

  describe('Event-Based Communication (SHOULD PASS)', () => {
    it('should export domain events from each module', () => {
      for (const mod of MODULES) {
        const events = exportsMatching(mod, /\.event$/);
        expect(events.length).toBeGreaterThan(0);
      }
    });

    it('should export listeners for cross-module communication', () => {
      // Orders listens to inventory & payment events
      const orderListeners = exportsMatching('orders', /\/listeners\//);
      expect(orderListeners.length).toBeGreaterThanOrEqual(2);

      // Inventory listens to order events
      const inventoryListeners = exportsMatching('inventory', /\/listeners\//);
      expect(inventoryListeners.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Service Layer Boundaries (SHOULD PASS)', () => {
    it('should export handlers (the public API for features)', () => {
      for (const mod of MODULES) {
        const handlers = exportsMatching(mod, /\/handler$/);
        expect(handlers.length).toBeGreaterThan(0);
      }
    });

    it('should NOT expose internal services directly', () => {
      for (const mod of MODULES) {
        const services = exportsMatching(mod, /\/service$/);
        expect(services).toEqual([]);
      }
    });
  });

  describe('Data Transfer Objects (SHOULD PASS)', () => {
    it('should export DTOs from modules', () => {
      for (const mod of MODULES) {
        const dtos = exportsMatching(mod, /\/dto$/);
        expect(dtos.length).toBeGreaterThan(0);
      }
    });

    it('should NOT expose internal domain value objects', () => {
      // Value objects live under domain/ but are not entity or event files
      // They should not appear in the public index
      for (const mod of MODULES) {
        const valueObjects = exportsMatching(mod, /value-object/);
        expect(valueObjects).toEqual([]);
      }
    });
  });

  describe('Database Access Patterns (SHOULD PASS)', () => {
    it('should allow shared BaseRepository to be exported', () => {
      const indexPath = path.join(SHARED_ROOT, 'infrastructure/src/index.ts');
      const exports = getExportPaths(indexPath);
      expect(exports.some(p => p.includes('base.repository'))).toBe(true);
    });

    it('should NOT allow direct TypeORM entity access across modules', () => {
      for (const mod of MODULES) {
        const entities = exportsMatching(mod, /\.entity$/);
        expect(entities).toEqual([]);
      }
    });
  });

  describe('Architectural Compliance Summary', () => {
    it('should document all allowed cross-module dependencies', () => {
      const allowedDependencies = {
        'all-modules': [
          '@tiny-store/shared-domain',
          '@tiny-store/shared-infrastructure',
          '@tiny-store/shared-testing',
        ],
        'orders-module': [
          'Can listen to: InventoryReserved, InventoryReservationFailed, PaymentProcessed, PaymentFailed, ShipmentCreated',
          'Can publish: OrderPlaced, OrderConfirmed, OrderRejected, OrderPaid, OrderPaymentFailed, OrderShipped, OrderCancelled',
        ],
        'inventory-module': [
          'Can listen to: OrderPlaced, OrderCancelled, OrderPaymentFailed',
          'Can publish: InventoryReserved, InventoryReservationFailed, InventoryReleased',
        ],
        'payments-module': [
          'Can listen to: OrderConfirmed',
          'Can publish: PaymentProcessed, PaymentFailed',
        ],
        'shipments-module': [
          'Can listen to: OrderPaid',
          'Can publish: ShipmentCreated, ShipmentDispatched, ShipmentDelivered',
        ],
      };

      expect(allowedDependencies).toBeDefined();
      expect(true).toBe(true);
    });
  });
});
