const aliases = new Map([
  ["api", "api"],
  ["kogaapi", "api"],
  ["koga-api", "api"],
  ["@koga/api", "api"],
  ["admin", "admin-web"],
  ["admin-web", "admin-web"],
  ["kogaadmin-web", "admin-web"],
  ["koga-admin-web", "admin-web"],
  ["@koga/admin-web", "admin-web"],
  ["customer", "customer-web"],
  ["customer-web", "customer-web"],
  ["kogacustomer-web", "customer-web"],
  ["koga-customer-web", "customer-web"],
  ["@koga/customer-web", "customer-web"],
]);

function normalize(value = "") {
  return value.toLowerCase().trim();
}

function inferFromText(value = "") {
  const text = normalize(value);
  if (!text) return "";
  if (aliases.has(text)) return aliases.get(text);
  if (text.includes("admin")) return "admin-web";
  if (text.includes("customer") || text.includes("portal")) return "customer-web";
  if (text.includes("api")) return "api";
  return "";
}

export function resolveRailwayTarget() {
  const candidates = [
    process.env.KOGA_RAILWAY_TARGET,
    process.env.KOGA_APP,
    process.env.RAILWAY_SERVICE_NAME,
    process.env.RAILWAY_PUBLIC_DOMAIN,
    process.env.RAILWAY_STATIC_URL,
  ];

  for (const candidate of candidates) {
    const target = inferFromText(candidate);
    if (target) return target;
  }

  throw new Error([
    "Cannot determine Railway target for this monorepo service.",
    "Set KOGA_RAILWAY_TARGET to one of: api, admin-web, customer-web.",
    "This keeps one shared railway.json from accidentally starting the wrong app. Because apparently clouds also need name tags.",
  ].join(" "));
}

export function commandForTarget(target, phase) {
  const commands = {
    api: {
      build: "corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm --filter @repo/db db:generate:postgres && pnpm --filter @koga/api build",
      start: "corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm --filter @koga/api start",
    },
    "admin-web": {
      build: "corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm --filter @koga/admin-web build",
      start: "corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm --filter @koga/admin-web start",
    },
    "customer-web": {
      build: "corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm --filter @koga/customer-web build",
      start: "corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm --filter @koga/customer-web start",
    },
  };

  const command = commands[target]?.[phase];
  if (!command) throw new Error(`Unsupported Railway target/phase: ${target}/${phase}`);
  return command;
}
