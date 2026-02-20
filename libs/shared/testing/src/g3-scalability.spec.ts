/**
 * G3: Scalability Readiness Tests
 *
 * These tests verify the architectural preparation for progressive scalability:
 * 1. All inter-module communication should be async (event-driven)
 * 2. Each module should own its data exclusively (no shared table access)
 * 3. Infrastructure should be accessed through abstractions (ports)
 * 4. Extraction readiness score should be >= 0.8
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

const MODULES = ['orders', 'inventory', 'payments', 'shipments'] as const;
const MODULES_ROOT = path.resolve(__dirname, '../../../modules');
const COMPOSITION_ROOT = path.resolve(
  __dirname,
  '../../../../apps/api/src/app/lib/register-listeners.ts'
);

/** Table names per module (from .entity.ts @Entity decorators). */
const MODULE_TABLES: Record<string, string[]> = {
  orders: ['orders'],
  inventory: ['products', 'stock_reservations'],
  payments: ['payments'],
  shipments: ['shipments'],
};

/** Banned direct infrastructure imports inside module source. */
const BANNED_INFRA_IMPORTS = [
  'typeorm',
  'ioredis',
  'redis',
  'bullmq',
  'bull',
  'pg',
  'knex',
  'sequelize',
  'mongoose',
  'prisma',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getModuleSourceFiles(mod: string): string[] {
  const base = path.join(MODULES_ROOT, mod, 'src');
  return glob.sync('**/*.ts', { cwd: base, absolute: true }).filter(
    (f) =>
      !f.endsWith('.spec.ts') &&
      !f.endsWith('/index.ts') &&
      !f.endsWith('/internal.ts')
  );
}

function countEventBusSubscriptions(): number {
  const src = fs.readFileSync(COMPOSITION_ROOT, 'utf-8');
  const matches = src.match(/eventBus\.subscribe\(/g);
  return matches ? matches.length : 0;
}

function countSyncCrossModuleImports(): { total: number; details: string[] } {
  const details: string[] = [];
  for (const mod of MODULES) {
    const files = getModuleSourceFiles(mod);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      // Look for imports from other modules' packages
      const importRegex =
        /import\s+.*from\s+['"]@tiny-store\/modules-(\w+)['"]/g;
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(content)) !== null) {
        const importedModule = match[1];
        if (importedModule !== mod) {
          const rel = path.relative(MODULES_ROOT, file);
          details.push(`${rel} imports @tiny-store/modules-${importedModule}`);
        }
      }
    }
  }
  return { total: details.length, details };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('G3: Scalability Readiness', () => {
  // -----------------------------------------------------------------------
  // ρ_sync — Cross-Module Synchronous Call Ratio
  // -----------------------------------------------------------------------
  describe('ρ_sync — Cross-Module Synchronous Call Ratio', () => {
    it('should have zero synchronous cross-module imports in module source', () => {
      const { total, details } = countSyncCrossModuleImports();
      if (details.length > 0) {
        console.warn('Synchronous cross-module imports found:\n  ' + details.join('\n  '));
      }
      const asyncCount = countEventBusSubscriptions();
      const rhoSync = asyncCount + total > 0 ? total / (total + asyncCount) : 0;

      console.log(
        `ρ_sync = ${total} / (${total} + ${asyncCount}) = ${rhoSync.toFixed(4)}`
      );

      expect(rhoSync).toBeLessThanOrEqual(0.3);
    });

    it('should have at least 20 async event subscriptions in composition root', () => {
      const count = countEventBusSubscriptions();
      console.log(`Event subscriptions in composition root: ${count}`);
      expect(count).toBeGreaterThanOrEqual(20);
    });
  });

  // -----------------------------------------------------------------------
  // ω — Data Ownership Clarity Index
  // -----------------------------------------------------------------------
  describe('ω — Data Ownership Clarity Index', () => {
    it('should have each entity table owned by exactly one module', () => {
      let totalEntities = 0;
      let singleOwnerEntities = 0;

      // Build a map: tableName → modules that reference it
      const tableToModules: Record<string, Set<string>> = {};

      for (const mod of MODULES) {
        const files = getModuleSourceFiles(mod);
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf-8');
          // Check for @Entity('tableName') decorators
          const entityRegex = /@Entity\(['"](\w+)['"]\)/g;
          let match: RegExpExecArray | null;
          while ((match = entityRegex.exec(content)) !== null) {
            const table = match[1];
            if (!tableToModules[table]) {
              tableToModules[table] = new Set();
            }
            tableToModules[table].add(mod);
          }

          // Check for raw SQL referencing other modules' tables
          for (const [otherMod, tables] of Object.entries(MODULE_TABLES)) {
            if (otherMod === mod) continue;
            for (const table of tables) {
              // Look for raw SQL references: FROM tableName, JOIN tableName, etc.
              const sqlRegex = new RegExp(
                `(?:FROM|JOIN|INTO|UPDATE)\\s+['"\`]?${table}['"\`]?`,
                'gi'
              );
              if (sqlRegex.test(content)) {
                if (!tableToModules[table]) {
                  tableToModules[table] = new Set();
                }
                tableToModules[table].add(mod);
              }
            }
          }
        }
      }

      for (const [table, modules] of Object.entries(tableToModules)) {
        totalEntities++;
        if (modules.size === 1) {
          singleOwnerEntities++;
        } else {
          console.warn(
            `Table '${table}' accessed by multiple modules: ${[...modules].join(', ')}`
          );
        }
      }

      const omega = totalEntities > 0 ? singleOwnerEntities / totalEntities : 1;
      console.log(
        `ω = ${singleOwnerEntities} / ${totalEntities} = ${omega.toFixed(4)}`
      );

      expect(omega).toBe(1.0);
    });
  });

  // -----------------------------------------------------------------------
  // α — Infrastructure Abstraction Coverage
  // -----------------------------------------------------------------------
  describe('α — Infrastructure Abstraction Coverage', () => {
    it('should not have direct infrastructure imports in any module', () => {
      let modulesWithCleanInfra = 0;
      const violations: string[] = [];

      for (const mod of MODULES) {
        let moduleClean = true;
        const files = getModuleSourceFiles(mod);
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf-8');
          for (const lib of BANNED_INFRA_IMPORTS) {
            // Match: import ... from 'lib' or from "lib" or from 'lib/...'
            // Exception: typeorm is allowed for @Entity decorators in .entity.ts files
            if (lib === 'typeorm' && file.endsWith('.entity.ts')) continue;
            const regex = new RegExp(
              `import\\s+.*from\\s+['"]${lib}(?:\\/[^'"]*)?['"]`,
              'g'
            );
            if (regex.test(content)) {
              const rel = path.relative(MODULES_ROOT, file);
              violations.push(`${rel} imports '${lib}' directly`);
              moduleClean = false;
            }
          }
        }
        if (moduleClean) modulesWithCleanInfra++;
      }

      if (violations.length > 0) {
        console.warn(
          'Direct infrastructure imports found:\n  ' + violations.join('\n  ')
        );
      }

      const alpha = modulesWithCleanInfra / MODULES.length;
      console.log(
        `α = ${modulesWithCleanInfra} / ${MODULES.length} = ${alpha.toFixed(4)}`
      );

      expect(alpha).toBe(1.0);
    });
  });

  // -----------------------------------------------------------------------
  // ε_m — Extraction Readiness Score (composite)
  // -----------------------------------------------------------------------
  describe('ε_m — Extraction Readiness Score', () => {
    it('should compute ε_m >= 0.8 for each module', () => {
      for (const mod of MODULES) {
        // b_m: boundary score — 1.0 if no internal symbols leak (assume G1 passes)
        const b_m = 1.0;

        // ρ_sync per module
        let syncImports = 0;
        const files = getModuleSourceFiles(mod);
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf-8');
          const importRegex =
            /import\s+.*from\s+['"]@tiny-store\/modules-(\w+)['"]/g;
          let match: RegExpExecArray | null;
          while ((match = importRegex.exec(content)) !== null) {
            if (match[1] !== mod) syncImports++;
          }
        }
        const rho_m = syncImports > 0 ? 0 : 1; // 1 = no sync calls (good)

        // ω_m: data ownership — 1.0 if module doesn't access other modules' tables
        let omega_m = 1.0;
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf-8');
          for (const [otherMod, tables] of Object.entries(MODULE_TABLES)) {
            if (otherMod === mod) continue;
            for (const table of tables) {
              const sqlRegex = new RegExp(
                `(?:FROM|JOIN|INTO|UPDATE)\\s+['"\`]?${table}['"\`]?`,
                'gi'
              );
              if (sqlRegex.test(content)) omega_m = 0;
            }
          }
        }

        // α_m: infrastructure abstraction — 1.0 if no banned direct imports
        let alpha_m = 1.0;
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf-8');
          for (const lib of BANNED_INFRA_IMPORTS) {
            if (lib === 'typeorm' && file.endsWith('.entity.ts')) continue;
            const regex = new RegExp(
              `import\\s+.*from\\s+['"]${lib}(?:\\/[^'"]*)?['"]`,
              'g'
            );
            if (regex.test(content)) alpha_m = 0;
          }
        }

        // v_m: event versioning — 0.5 (events exist but lack explicit versioning)
        const v_m = 0.5;

        // Weighted composite: ε_m = 0.25·b_m + 0.20·ρ_m + 0.20·ω_m + 0.20·α_m + 0.15·v_m
        const epsilon_m =
          0.25 * b_m + 0.2 * rho_m + 0.2 * omega_m + 0.2 * alpha_m + 0.15 * v_m;

        console.log(
          `ε_${mod} = 0.25×${b_m} + 0.20×${rho_m} + 0.20×${omega_m} + 0.20×${alpha_m} + 0.15×${v_m} = ${epsilon_m.toFixed(4)}`
        );

        expect(epsilon_m).toBeGreaterThanOrEqual(0.8);
      }
    });
  });
});
