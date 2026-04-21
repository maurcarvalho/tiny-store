/**
 * G2 Metrics — Module Boundary Analysis
 *
 * Usage: npx ts-node tools/metrics/g2-metrics.ts
 *
 * Measures:
 *   1. Export count per module (from index.ts)
 *   2. API Boundary Ratio: fraction of @tiny-store/modules-* imports across
 *      the codebase that use the public entrypoint (not /internal or deep paths)
 */

import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const glob = require('glob') as { sync: (pattern: string, opts: any) => string[] };

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const MODULES_ROOT = path.join(PROJECT_ROOT, 'libs/modules');
const MODULES = ['orders', 'inventory', 'payments', 'shipments'] as const;

interface ModuleExportInfo {
  module: string;
  exportCount: number;
}

interface ImportInfo {
  file: string;
  importPath: string;
  isPublic: boolean;
}

interface G2Report {
  exports: ModuleExportInfo[];
  imports: ImportInfo[];
  boundaryRatio: number;
}

function countExports(mod: string): number {
  const indexPath = path.join(MODULES_ROOT, mod, 'src', 'index.ts');
  if (!fs.existsSync(indexPath)) return 0;

  const content = fs.readFileSync(indexPath, 'utf-8');
  const exportLines = content
    .split('\n')
    .filter((line) => /^\s*export\s/.test(line));

  return exportLines.length;
}

function findAllModuleImports(): ImportInfo[] {
  const allTsFiles = glob.sync('**/*.ts', {
    cwd: PROJECT_ROOT,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/exercises/**', '**/*.spec.ts', '**/*.test.ts'],
  });

  const imports: ImportInfo[] = [];
  const importRegex = /import\s+.*from\s+['"](@tiny-store\/modules-[^'"]+)['"]/g;

  for (const file of allTsFiles) {
    // Skip files inside modules themselves (internal imports are expected)
    const relPath = path.relative(PROJECT_ROOT, file);
    if (relPath.startsWith('libs/modules/')) {
      const parts = relPath.split(path.sep);
      const fileModule = parts[2]; // e.g., 'orders'
      // Only count imports of OTHER modules
      const content = fs.readFileSync(file, 'utf-8');
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        const targetModule = importPath.replace('@tiny-store/modules-', '').split('/')[0];
        if (targetModule !== fileModule) {
          const isPublic = importPath === `@tiny-store/modules-${targetModule}`;
          imports.push({ file: relPath, importPath, isPublic });
        }
      }
    } else {
      // External consumers (apps, tools, etc.) — all module imports count
      const content = fs.readFileSync(file, 'utf-8');
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        const targetModule = importPath.replace('@tiny-store/modules-', '').split('/')[0];
        const isPublic = importPath === `@tiny-store/modules-${targetModule}`;
        imports.push({ file: relPath, importPath, isPublic });
      }
    }
  }

  return imports;
}

function computeG2Metrics(): G2Report {
  const exports: ModuleExportInfo[] = MODULES.map((mod) => ({
    module: mod,
    exportCount: countExports(mod),
  }));

  const imports = findAllModuleImports();
  const totalImports = imports.length;
  const publicImports = imports.filter((i) => i.isPublic).length;
  const boundaryRatio = totalImports > 0 ? publicImports / totalImports : 1;

  return { exports, imports, boundaryRatio };
}

function printReport(): void {
  const { exports, imports, boundaryRatio } = computeG2Metrics();

  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  G2 Metrics — Module Boundary Analysis           ║`);
  console.log(`╠══════════════════════════════════════════════════╣`);

  console.log(`║                                                  ║`);
  console.log(`║  Exports per module:                             ║`);
  for (const e of exports) {
    console.log(`║    ${e.module.padEnd(20)} ${String(e.exportCount).padStart(3)} exports       ║`);
  }

  console.log(`║                                                  ║`);
  console.log(`║  Cross-module imports:                           ║`);

  const totalImports = imports.length;
  const publicImports = imports.filter((i) => i.isPublic).length;
  const nonPublicImports = imports.filter((i) => !i.isPublic);

  console.log(`║    Total:  ${String(totalImports).padStart(3)}                                ║`);
  console.log(`║    Public: ${String(publicImports).padStart(3)}                                ║`);
  console.log(`║    Deep:   ${String(nonPublicImports.length).padStart(3)}                                ║`);

  if (nonPublicImports.length > 0) {
    console.log(`║                                                  ║`);
    console.log(`║  Non-public imports (violations):                ║`);
    for (const imp of nonPublicImports) {
      console.log(`║    ${imp.file.substring(0, 44).padEnd(44)}║`);
      console.log(`║      → ${imp.importPath.substring(0, 40).padEnd(40)}  ║`);
    }
  }

  console.log(`║                                                  ║`);
  console.log(`╠══════════════════════════════════════════════════╣`);
  console.log(`║  API Boundary Ratio: ${boundaryRatio.toFixed(4).padEnd(27)}║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);
}

// CLI entry point
if (require.main === module) {
  printReport();
}

export { computeG2Metrics, G2Report, ModuleExportInfo, ImportInfo };
