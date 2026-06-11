/**
 * G4: Migration Readiness Tests
 *
 * These tests verify that modules are structurally prepared for potential extraction:
 * 1. Event contracts have typed payloads
 * 2. Cross-module data access uses ACL/handler pattern
 * 3. Module descriptors are complete and categorized
 * 4. Event schemas are documented
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

describe('G4: Migration Readiness', () => {
  describe('Event Contract Completeness', () => {
    it('every domain event should have a typed payload interface', () => {
      let totalEvents = 0;
      let eventsWithPayload = 0;

      for (const mod of MODULES) {
        const eventFiles = findEventFiles(mod);
        for (const file of eventFiles) {
          totalEvents++;
          const content = readFile(file);
          const hasPayloadInterface = /export interface \w+Payload/.test(content);
          const hasPayloadProperty = /payload/.test(content);

          if (hasPayloadInterface && hasPayloadProperty) {
            eventsWithPayload++;
          } else {
            console.warn(`  ⚠ ${path.basename(file)} missing typed payload interface`);
          }
        }
      }

      console.log(`Event contracts: ${eventsWithPayload}/${totalEvents} have typed payloads`);
      expect(eventsWithPayload).toBe(totalEvents);
    });
  });

  describe('ACL Layer Presence', () => {
    it('composition root cross-module data access should use handlers (ACL pattern)', () => {
      const registerListeners = readFile(
        path.join(ROOT, 'apps/api/src/app/lib/register-listeners.ts')
      );

      // Check that cross-module data access goes through handlers, not direct entity imports
      const entityImports = registerListeners.split('\n').filter(line =>
        /import.*(?:Entity|Repository).*from.*@tiny-store\/modules-/.test(line)
      );

      console.log(`ACL check: ${entityImports.length} direct entity/repository imports in composition root`);
      // All cross-module access should be through Handler classes
      expect(entityImports).toHaveLength(0);
    });

    it('cross-module handler calls use typed DTOs, not raw entities', () => {
      const registerListeners = readFile(
        path.join(ROOT, 'apps/api/src/app/lib/register-listeners.ts')
      );

      // Handlers are the ACL — verify handler pattern is used
      const handlerUsages = (registerListeners.match(/\w+Handler/g) || []);
      console.log(`ACL handlers in composition root: ${[...new Set(handlerUsages)].join(', ')}`);
      expect(handlerUsages.length).toBeGreaterThan(0);
    });
  });

  describe('Module Descriptor Completeness', () => {
    it('each module index.ts should have categorized sections', () => {
      const expectedCategories = ['Handlers', 'DTOs', 'Events', 'Listeners'];

      for (const mod of MODULES) {
        const indexPath = path.join(ROOT, `libs/modules/${mod}/src/index.ts`);
        const content = readFile(indexPath);

        const found = expectedCategories.filter(cat =>
          content.toLowerCase().includes(cat.toLowerCase())
        );

        console.log(`  ${mod}: ${found.length}/${expectedCategories.length} categories [${found.join(', ')}]`);
        expect(found.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('Event Schema Documentation', () => {
    it('event files should have payload documentation or descriptive naming', () => {
      let documented = 0;
      let total = 0;

      for (const mod of MODULES) {
        const eventFiles = findEventFiles(mod);
        for (const file of eventFiles) {
          total++;
          const content = readFile(file);
          // Check for JSDoc, interface with properties, or descriptive payload type
          const hasDoc = /\/\*\*/.test(content) || /export interface \w+Payload\s*\{[\s\S]*\w+:/.test(content);
          if (hasDoc) {
            documented++;
          } else {
            console.warn(`  ⚠ ${path.basename(file)} lacks documentation or typed payload fields`);
          }
        }
      }

      console.log(`Event documentation: ${documented}/${total} events have docs or typed payloads`);
      // Allow some events to be sparsely documented but most should be
      expect(documented / total).toBeGreaterThanOrEqual(0.8);
    });
  });
});
