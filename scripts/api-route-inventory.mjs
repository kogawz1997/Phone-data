import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sources = [
  path.join(root, 'apps/api/src/main.ts'),
  path.join(root, 'apps/api/src/modules'),
];

function listTsFiles(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return target.endsWith('.ts') ? [target] : [];
  return fs.readdirSync(target).flatMap((name) => listTsFiles(path.join(target, name)));
}

const regex = /app\.(get|post|patch|put|delete)\(\"([^\"]+)\"/g;
const routes = [];
for (const file of sources.flatMap(listTsFiles)) {
  const source = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = regex.exec(source))) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2],
      file: path.relative(root, file),
    });
  }
}

routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
const groups = routes.reduce((acc, route) => {
  const first = route.path.split('/').filter(Boolean)[0] || 'root';
  acc[first] ??= [];
  acc[first].push(route);
  return acc;
}, {});
const out = { generatedAt: new Date().toISOString(), total: routes.length, groups };
const outPath = path.join(root, 'docs/architecture/api-route-inventory.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`API routes: ${routes.length}`);
console.log(`Wrote ${outPath}`);
if (routes.length < 100) process.exitCode = 1;
