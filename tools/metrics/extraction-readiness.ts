/**
 * Extraction Readiness Calculator (ε_m)
 *
 * Usage: npx ts-node tools/metrics/extraction-readiness.ts --module orders
 *
 * Binary gate: ε_m = 1 only when ALL 5 checks pass, 0 otherwise.
 *
 * Checks:
 *   1. Cross-module imports   — 0 cross-module imports
 *   2. Event-bus usage        — has listeners AND events
 *   3. ACL layer              — has index.ts AND internal.ts
 *   4. Database schema iso    — schema-isolation file exists
 *   5. Versioned events       — all events have version field
 */

import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const glob = require('glob') as { sync: (pattern: string, opts: any) => string[] };

const MODULES_ROOT = path.resolve(__dirname, '../../libs/modules');
const INFRA_ROOT = path.resolve(__dirname, '../../libs/shared/infrastructure/src');

interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
}

function getModuleSourceFiles(mod: string): string[] {
  const base = path.join(MODULES_ROOT, mod, 'src');
  if (!fs.existsSync(base)) return [];
  return glob.sync('**/*.ts', { cwd: base, absolute: true }).filter(
    (f: string) => !f.endsWith('.spec.ts') && !f.endsWith('.test.ts')
  );
}

function checkCrossModuleImports(mod: string): CheckResult {
  const files = getModuleSourceFiles(mod);
  let crossImports = 0;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const regex = /import\s+.*from\s+['"]@tiny-store\/modules-(\w+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      if (match[1] !== mod) crossImports++;
    }
  }
  return {
    name: 'Cross-module imports',
    pass: crossImports === 0,
    detail: crossImports === 0 ? 'No cross-module imports' : `${crossImports} cross-module import(s) found`,
  };
}

function checkEventBusUsage(mod: string): CheckResult {
  const listenersDir = path.join(MODULES_ROOT, mod, 'src', 'listeners');
  const hasListeners = fs.existsSync(listenersDir) &&
    fs.readdirSync(listenersDir).some((f) => f.endsWith('.ts'));

  const eventsDir = path.join(MODULES_ROOT, mod, 'src', 'domain', 'events');
  const hasEvents = fs.existsSync(eventsDir) &&
    fs.readdirSync(eventsDir).some((f) => f.endsWith('.ts'));

  const pass = hasListeners && hasEvents;
  return {
    name: 'Event-bus usage',
    pass,
    detail: `listeners=${hasListeners ? 'yes' : 'no'}, events=${hasEvents ? 'yes' : 'no'}`,
  };
}

function checkACLLayer(mod: string): CheckResult {
  const indexPath = path.join(MODULES_ROOT, mod, 'src', 'index.ts');
  const internalPath = path.join(MODULES_ROOT, mod, 'src', 'internal.ts');
  const hasIndex = fs.existsSync(indexPath);
  const hasInternal = fs.existsSync(internalPath);
  const pass = hasIndex && hasInternal;
  return {
    name: 'ACL layer (public API boundary)',
    pass,
    detail: `index.ts=${hasIndex ? 'yes' : 'no'}, internal.ts=${hasInternal ? 'yes' : 'no'}`,
  };
}

function checkSchemaIsolation(): CheckResult {
  const schemaFile = path.join(INFRA_ROOT, 'database', 'schema-isolation.ts');
  const exists = fs.existsSync(schemaFile);
  return {
    name: 'Database schema isolation',
    pass: exists,
    detail: exists ? 'schema-isolation.ts present' : 'schema-isolation.ts missing',
  };
}

function checkVersionedEvents(mod: string): CheckResult {
  const eventsDir = path.join(MODULES_ROOT, mod, 'src', 'domain', 'events');
  if (!fs.existsSync(eventsDir)) {
    return { name: 'Versioned event contracts', pass: false, detail: 'No events directory' };
  }
  const eventFiles = fs.readdirSync(eventsDir).filter((f) => f.endsWith('.ts'));
  if (eventFiles.length === 0) {
    return { name: 'Versioned event contracts', pass: false, detail: 'No event files found' };
  }
  let withVersion = 0;
  for (const file of eventFiles) {
    const content = fs.readFileSync(path.join(eventsDir, file), 'utf-8');
    if (/version:\s*\d+/.test(content) || /version\s*=\s*\d+/.test(content)) withVersion++;
  }
  const allVersioned = withVersion === eventFiles.length;
  return {
    name: 'Versioned event contracts',
    pass: allVersioned,
    detail: `${withVersion}/${eventFiles.length} events with version field`,
  };
}

function computeExtractionReadiness(mod: string): { checks: CheckResult[]; epsilon: number } {
  const checks = [
    checkCrossModuleImports(mod),
    checkEventBusUsage(mod),
    checkACLLayer(mod),
    checkSchemaIsolation(),
    checkVersionedEvents(mod),
  ];
  const allPass = checks.every((c) => c.pass);
  return { checks, epsilon: allPass ? 1 : 0 };
}

function printReport(mod: string): void {
  const { checks, epsilon } = computeExtractionReadiness(mod);

  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  Extraction Readiness Report: ${mod.padEnd(19)}║`);
  console.log(`╠══════════════════════════════════════════════════╣`);
  for (const check of checks) {
    const status = check.pass ? 'PASS' : 'FAIL';
    const icon = check.pass ? '✓' : '✗';
    console.log(`║  ${icon} [${status}] ${check.name.padEnd(33)}║`);
    console.log(`║    ${check.detail.padEnd(44)}║`);
  }
  console.log(`╠══════════════════════════════════════════════════╣`);
  console.log(`║  ε_${mod.padEnd(10)} = ${epsilon}${' '.repeat(33)}║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const moduleIdx = args.indexOf('--module');
  const moduleName = moduleIdx >= 0 ? args[moduleIdx + 1] : undefined;

  if (!moduleName) {
    console.log('Usage: npx ts-node tools/metrics/extraction-readiness.ts --module <name>');
    console.log('Available modules: orders, inventory, payments, shipments');
    process.exit(1);
  }

  printReport(moduleName);
}

export { computeExtractionReadiness, printReport, CheckResult };
