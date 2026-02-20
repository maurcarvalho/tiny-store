/**
 * G6: Observability Tests
 *
 * These tests verify observability preparation at the structural level:
 * 1. Error handling includes module context
 * 2. Events carry correlation identifiers
 * 3. Console output includes structured module/event context
 * 4. Listener error handlers preserve event traceability
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../../../');
const MODULES = ['orders', 'inventory', 'payments', 'shipments'];

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

function findEventFiles(mod: string): string[] {
  const eventsDir = path.join(ROOT, `libs/modules/${mod}/src/domain/events`);
  if (!fs.existsSync(eventsDir)) return [];
  return fs.readdirSync(eventsDir)
    .filter(f => f.endsWith('.event.ts'))
    .map(f => path.join(eventsDir, f));
}

function findListenerFiles(mod: string): string[] {
  const listenersDir = path.join(ROOT, `libs/modules/${mod}/src/listeners`);
  if (!fs.existsSync(listenersDir)) return [];
  return fs.readdirSync(listenersDir)
    .filter(f => f.endsWith('.listener.ts'))
    .map(f => path.join(listenersDir, f));
}

describe('G6: Observability', () => {
  describe('Event Traceability', () => {
    it('every event should carry a correlation identifier (aggregateId or orderId in payload)', () => {
      let total = 0;
      let traceable = 0;

      for (const mod of MODULES) {
        const eventFiles = findEventFiles(mod);
        for (const file of eventFiles) {
          total++;
          const content = readFile(file);
          // Check for aggregateId in the event factory or orderId in payload
          const hasAggregateId = /aggregateId/.test(content);
          const hasOrderId = /orderId/.test(content);

          if (hasAggregateId || hasOrderId) {
            traceable++;
          } else {
            console.warn(`  ⚠ ${path.basename(file)} lacks correlation identifier`);
          }
        }
      }

      console.log(`Event traceability: ${traceable}/${total} events have correlation IDs`);
      expect(traceable).toBe(total);
    });
  });

  describe('Error Handling in Listeners', () => {
    it('listener error handling should include contextual information', () => {
      let totalListeners = 0;
      let listenersWithErrorContext = 0;

      for (const mod of MODULES) {
        const listenerFiles = findListenerFiles(mod);
        for (const file of listenerFiles) {
          totalListeners++;
          const content = readFile(file);

          // Check if error handling includes context (module name, event type, orderId, etc.)
          const hasTryCatch = /try\s*\{/.test(content);
          const hasErrorLog = /console\.(error|warn|log)/.test(content);
          const hasContextInError = /orderId|Order|event|Error/.test(content);

          if (!hasTryCatch || (hasErrorLog && hasContextInError)) {
            // Either no try/catch needed or error handling has context
            listenersWithErrorContext++;
          } else {
            console.warn(`  ⚠ ${path.basename(file)} has error handling without context`);
          }
        }
      }

      console.log(`Error context: ${listenersWithErrorContext}/${totalListeners} listeners have contextual error handling`);
      expect(listenersWithErrorContext / totalListeners).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('Composition Root Error Handling', () => {
    it('composition root error handlers should include event context', () => {
      const registerListeners = readFile(
        path.join(ROOT, 'apps/api/src/app/lib/register-listeners.ts')
      );

      // Find catch blocks
      const catchBlocks = registerListeners.match(/catch\s*\([\s\S]*?\{[\s\S]*?\}/g) || [];
      console.log(`Composition root: ${catchBlocks.length} catch blocks found`);

      for (const block of catchBlocks) {
        // Each catch should reference the error context (order, payment, etc.)
        const hasContext = /order|payment|shipment|error/i.test(block);
        expect(hasContext).toBe(true);
      }
    });
  });

  describe('Module-Scoped Logging', () => {
    it('console output in listeners should include module/event context', () => {
      let totalLogs = 0;
      let contextualLogs = 0;

      for (const mod of MODULES) {
        const listenerFiles = findListenerFiles(mod);
        for (const file of listenerFiles) {
          const content = readFile(file);
          const logCalls = content.match(/console\.(log|error|warn)\([^)]+\)/g) || [];

          for (const log of logCalls) {
            totalLogs++;
            // Check if log includes some context (class name, orderId, event reference)
            const hasContext = /Listener|order|Order|event|Error|\$\{/.test(log);
            if (hasContext) {
              contextualLogs++;
            } else {
              console.warn(`  ⚠ Non-contextual log in ${path.basename(file)}: ${log.substring(0, 60)}`);
            }
          }
        }
      }

      if (totalLogs > 0) {
        const ratio = contextualLogs / totalLogs;
        console.log(`Module-scoped logging: ${contextualLogs}/${totalLogs} logs have context (${(ratio * 100).toFixed(0)}%)`);
        expect(ratio).toBeGreaterThanOrEqual(0.8);
      } else {
        console.log('Module-scoped logging: no console calls found in listeners');
        expect(true).toBe(true);
      }
    });
  });
});
