/**
 * G2: Maintainability Tests
 *
 * These tests verify the longitudinal health signals for maintainability:
 * 1. API-only dependency ratio (ρ_api) — cross-module refs through public surfaces
 * 2. API surface size per module — detect inflation early
 * 3. Module complexity concentration (Γ) — no single module dominates
 * 4. Fan-in concentration (φ_m) — no domain module becomes a shared library
 * 5. Wiring density — composition root coupling complexity
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../../../');
const MODULES = ['orders', 'inventory', 'payments', 'shipments'];
const REGISTER_LISTENERS = path.join(ROOT, 'apps/api/src/app/lib/register-listeners.ts');

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

function moduleIndexPath(mod: string): string {
  return path.join(ROOT, `libs/modules/${mod}/src/index.ts`);
}

function countExportLines(filePath: string): number {
  const content = readFile(filePath);
  return content.split('\n').filter(line => line.trim().startsWith('export ')).length;
}

describe('G2: Maintainability', () => {
  describe('ρ_api — API-Only Dependency Ratio', () => {
    it('should have ρ_api >= 0.95 in the composition root', () => {
      const content = readFile(REGISTER_LISTENERS);
      const importLines = content.split('\n').filter(l => l.includes('import ') && l.includes('@tiny-store/modules-'));
      const totalModuleImports = importLines.length;
      const internalImports = importLines.filter(l => /modules-\w+\/(?:src|internal)/.test(l)).length;
      const publicImports = totalModuleImports - internalImports;
      const rhoApi = totalModuleImports > 0 ? publicImports / totalModuleImports : 1;

      console.log(`ρ_api = ${rhoApi.toFixed(2)} (${publicImports}/${totalModuleImports} public imports)`);
      expect(rhoApi).toBeGreaterThanOrEqual(0.95);
    });
  });

  describe('G_api — API Surface Size', () => {
    const exportCounts: Record<string, number> = {};

    beforeAll(() => {
      for (const mod of MODULES) {
        exportCounts[mod] = countExportLines(moduleIndexPath(mod));
      }
    });

    it('should have no module exceeding 25 exports', () => {
      for (const mod of MODULES) {
        console.log(`  ${mod}: ${exportCounts[mod]} exports`);
        expect(exportCounts[mod]).toBeLessThanOrEqual(25);
      }
    });

    it('should log baseline export counts', () => {
      console.log('G_api baseline:', JSON.stringify(exportCounts));
      expect(Object.keys(exportCounts)).toHaveLength(MODULES.length);
    });
  });

  describe('Γ — Module Complexity Concentration', () => {
    it('should have Γ <= 3.0', () => {
      const counts = MODULES.map(m => countExportLines(moduleIndexPath(m)));
      const max = Math.max(...counts);
      const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
      const gamma = max / mean;

      console.log(`Γ = ${gamma.toFixed(2)} (max=${max}, mean=${mean.toFixed(2)})`);
      expect(gamma).toBeLessThanOrEqual(3.0);
    });
  });

  describe('σ_m — Contract Stability (baseline)', () => {
    it('each module index.ts should have categorized export sections', () => {
      const requiredSections = ['Handlers', 'DTOs', 'Events', 'Listeners'];

      for (const mod of MODULES) {
        const content = readFile(moduleIndexPath(mod));
        const foundSections = requiredSections.filter(section =>
          content.toLowerCase().includes(section.toLowerCase())
        );
        console.log(`  ${mod}: sections [${foundSections.join(', ')}]`);
        expect(foundSections.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('φ_m — Fan-In Concentration', () => {
    it('should have φ_m <= 0.5 for all domain modules', () => {
      for (const mod of MODULES) {
        // Scan other modules' source files for imports from this module
        const otherModules = MODULES.filter(m => m !== mod);
        let importingModules = 0;

        for (const other of otherModules) {
          const srcDir = path.join(ROOT, `libs/modules/${other}/src`);
          const files = getAllTsFiles(srcDir);
          const importsFromMod = files.some(f => {
            const content = readFile(f);
            return content.includes(`@tiny-store/modules-${mod}`);
          });
          if (importsFromMod) importingModules++;
        }

        const phi = importingModules / otherModules.length;
        console.log(`  φ_${mod} = ${phi.toFixed(2)} (${importingModules}/${otherModules.length} modules import it)`);
        expect(phi).toBeLessThanOrEqual(0.5);
      }
    });
  });

  describe('Wiring Density', () => {
    it('should record composition root wiring baseline', () => {
      const content = readFile(REGISTER_LISTENERS);
      const subscriptions = (content.match(/eventBus\.subscribe\(/g) || []).length;
      const handlerInstantiations = (content.match(/new \w+(?:Handler|Listener)\(/g) || []).length;

      console.log(`Wiring density: ${subscriptions} subscriptions, ${handlerInstantiations} handler/listener instantiations`);
      expect(subscriptions).toBeGreaterThan(0);
      expect(handlerInstantiations).toBeGreaterThan(0);
    });
  });
});

function getAllTsFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllTsFiles(fullPath));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}
