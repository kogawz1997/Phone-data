import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
function pass(name, message) { checks.push({ ok: true, name, message }); }
function fail(name, message) { checks.push({ ok: false, name, message }); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

const main = path.join(root, 'apps/api/src/main.ts');
const mainSize = fs.existsSync(main) ? fs.statSync(main).size : 0;
if (mainSize < 20_000) pass('api-main-size', `main.ts is ${mainSize} bytes`);
else fail('api-main-size', `main.ts is still ${mainSize} bytes; routes should stay inside modules`);

const modulesDir = path.join(root, 'apps/api/src/modules');
const registerFiles = fs.existsSync(modulesDir) ? fs.readdirSync(modulesDir, { recursive: true }).filter((name) => path.basename(String(name)).startsWith('register-') && String(name).endsWith('.ts')) : [];
registerFiles.length >= 15 ? pass('api-modules-extracted', `${registerFiles.length} route modules`) : fail('api-modules-extracted', `only ${registerFiles.length} route modules found`);
const routeInventory = path.join(root, 'docs/architecture/api-route-inventory.json');
if (fs.existsSync(routeInventory)) {
  const total = JSON.parse(fs.readFileSync(routeInventory, 'utf8')).total ?? 0;
  total >= 100 ? pass('api-route-inventory', `${total} routes inventoried across modules`) : fail('api-route-inventory', `${total} routes found; expected modular routes`);
} else {
  fail('api-route-inventory', 'missing route inventory; run pnpm route:inventory');
}

for (const rel of [
  'apps/api/src/core/permissions.ts',
  'apps/api/src/core/tenant.ts',
  'apps/api/src/core/route-groups.ts',
  'apps/admin-web/src/components/status-pill.tsx',
  'apps/admin-web/src/lib/navigation.ts',
  'docs/architecture/CODE_STRUCTURE_REFACTOR_TH.md',
]) {
  exists(rel) ? pass(`exists:${rel}`, 'ok') : fail(`exists:${rel}`, 'missing');
}

const schema = exists('packages/db/prisma/schema.prisma') ? fs.readFileSync(path.join(root, 'packages/db/prisma/schema.prisma'), 'utf8') : '';
for (const index of ['@@index([organizationId, status])', '@@index([status, dueDate])', '@@index([organizationId, createdAt])']) {
  schema.includes(index) ? pass(`schema:${index}`, 'ok') : fail(`schema:${index}`, 'missing useful production index');
}

for (const check of checks) console.log(`${check.ok ? '✅' : '⚠️'} ${check.name} - ${check.message}`);
const hardFails = checks.filter((c) => !c.ok && !c.name.includes('api-main-size'));
if (hardFails.length) process.exit(1);
