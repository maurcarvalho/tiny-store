/**
 * Extraction Readiness Calculator (ε_m)
 *
 * Usage: npx ts-node tools/metrics/extraction-readiness.ts --module orders
 *
 * Five checks (100 pts total):
 *   1. Cross-module imports   — 25 pts (0 imports = full score)
 *   2. Event-bus usage        — 20 pts (has listeners = full score)
 *   3. ACL layer              — 15 pts (public API via index.ts = full score)
 *   4. Database schema iso    — 20 pts (schema-isolation file exists)
 *   5. Versioned events       — 20 pts (events have version field)
 */

import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const glob = require('glob') as { sync: (pattern: string, opts: any) => string[] };

const MODULES_ROOT = path.resolve(__dirname, '../../libs/modules');
const INFRA_ROOT = path.resolve(__dirname, '../../libs/shared/infrastructure/src');

interface CheckResult {
  name: string;
  maxPoints: number;
  score: number;
  detail: string;
}

function getModuleSourceFiles(mod: string): string[] {
  const base = path.join(MODULES_ROOT, mod, 'src');
  if (!fs.existsSync(base)) return [];
  return glob.sync('**/*.ts', { cwd: base, absolute: true }).filter(
    (f) => !f.endsWith('.spec.ts') && !f.endsWith('.test.ts')
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
  const score = crossImports === 0 ? 25 : Math.max(0, 25 - crossImports * 5);
  return {
    name: 'Cross-module imports',
    maxPoints: 25,
    score,
    detail: crossImports === 0 ? 'No cross-module imports ✓' : `${crossImports} cross-module import(s) found`,
  };
}

function checkEventBusUsage(mod: string): CheckResult {
  const listenersDir = path.join(MODULES_ROOT, mod, 'src', 'listeners');
  const hasListeners = fs.existsSync(listenersDir) &&
    fs.readdirSync(listenersDir).some((f) => f.endsWith('.ts'));

  const eventsDir = path.join(MODULES_ROOT, mod, 'src', 'domain', 'events');
  const hasEvents = fs.existsSync(eventsDir) &&
    fs.readdirSync(eventsDir).some((f) => f.endsWith('.ts'));

  const score = (hasListeners ? 10 : 0) + (hasEvents ? 10 : 0);
  return {
    name: 'Event-bus usage',
    maxPoints: 20,
    score,
    detail: `listeners=${hasListeners ? 'yes' : 'no'}, events=${hasEvents ? 'yes' : 'no'}`,
  };
}

function checkACLLayer(mod: string): CheckResult {
  const indexPath = path.join(MODULES_ROOT, mod, 'src', 'index.ts');
  const internalPath = path.join(MODULES_ROOT, mod, 'src', 'internal.ts');
  const hasIndex = fs.existsSync(indexPath);
  const hasInternal = fs.existsSync(internalPath);
  const score = (hasIndex ? 10 : 0) + (hasInternal ? 5 : 0);
  return {
    name: 'ACL layer (public API boundary)',
    maxPoints: 15,
    score,
    detail: `index.ts=${hasIndex ? 'yes' : 'no'}, internal.ts=${hasInternal ? 'yes' : 'no'}`,
  };
}

function checkSchemaIsolation(): CheckResult {
  const schemaFile = path.join(INFRA_ROOT, 'database', 'schema-isolation.ts');
  const exists = fs.existsSync(schemaFile);
  return {
    name: 'Database schema isolation',
    maxPoints: 20,
    score: exists ? 20 : 0,
    detail: exists ? 'schema-isolation.ts present ✓' : 'schema-isolation.ts missing',
  };
}

function checkVersionedEvents(mod: string): CheckResult {
  const eventsDir = path.join(MODULES_ROOT, mod, 'src', 'domain', 'events');
  if (!fs.existsSync(eventsDir)) {
    return { name: 'Versioned event contracts', maxPoints: 20, score: 0, detail: 'No events directory' };
  }
  const eventFiles = fs.readdirSync(eventsDir).filter((f) => f.endsWith('.ts'));
  let withVersion = 0;
  for (const file of eventFiles) {
    const content = fs.readFileSync(path.join(eventsDir, file), 'utf-8');
    if (/version:\s*\d+/.test(content) || /version\s*=\s*\d+/.test(content)) withVersion++;
  }
  const ratio = eventFiles.length > 0 ? withVersion / eventFiles.length : 0;
  const score = Math.round(ratio * 20);
  return {
    name: 'Versioned event contracts',
    maxPoints: 20,
    score,
    detail: `${withVersion}/${eventFiles.length} events with version field`,
  };
}

function computeExtractionReadiness(mod: string): { checks: CheckResult[]; total: number; max: number; normalized: number } {
  const checks = [
    checkCrossModuleImports(mod),
    checkEventBusUsage(mod),
    checkACLLayer(mod),
    checkSchemaIsolation(),
    checkVersionedEvents(mod),
  ];
  const total = checks.reduce((s, c) => s + c.score, 0);
  const max = checks.reduce((s, c) => s + c.maxPoints, 0);
  return { checks, total, max, normalized: total / max };
}

function printReport(mod: string): void {
  const { checks, total, max, normalized } = computeExtractionReadiness(mod);

  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  Extraction Readiness Report: ${mod.padEnd(19)}║`);
  console.log(`╠══════════════════════════════════════════════════╣`);
  for (const check of checks) {
    const bar = '█'.repeat(Math.round((check.score / check.maxPoints) * 10)).padEnd(10, '░');
    console.log(`║  ${check.name.padEnd(32)} ${bar} ${String(check.score).padStart(2)}/${check.maxPoints}  ║`);
    console.log(`║    ${check.detail.padEnd(44)}║`);
  }
  console.log(`╠══════════════════════════════════════════════════╣`);
  console.log(`║  ε_${mod.padEnd(10)} = ${total}/${max} = ${normalized.toFixed(4).padEnd(24)}║`);
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
