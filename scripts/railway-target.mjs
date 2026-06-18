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
  ["owner", "owner-web"],
  ["owner-web", "owner-web"],
  ["platform", "owner-web"],
  ["platform-owner", "owner-web"],
  ["koga-owner-web", "owner-web"],
  ["customer", "customer-web"],
  ["customer-web", "customer-web"],
  ["kogacustomer-web", "customer-web"],
  ["koga-customer-web", "customer-web"],
  ["@koga/customer-web", "customer-web"],
]);

function normalize(value = "") {
  return String(value).toLowerCase().trim();
}

function inferFromText(value = "") {
  const text = normalize(value);
  if (!text) return "";
  if (aliases.has(text)) return aliases.get(text);
  if (text.includes("owner") || text.includes("platform")) return "owner-web";
  if (text.includes("admin") || text.includes("store")) return "admin-web";
  if (text.includes("customer") || text.includes("portal")) return "customer-web";
  if (text.includes("api")) return "api";
  return "";
}

function describeCandidate(name, value) {
  if (!value) return `${name}=<empty>`;
  const text = String(value);
  if (text.length <= 80) return `${name}=${text}`;
  return `${name}=${text.slice(0, 32)}...${text.slice(-16)}`;
}

export function resolveRailwayTarget() {
  const namedCandidates = [
    ["KOGA_RAILWAY_TARGET", process.env.KOGA_RAILWAY_TARGET],
    ["KOGA_APP", process.env.KOGA_APP],
    ["RAILWAY_SERVICE_NAME", process.env.RAILWAY_SERVICE_NAME],
    ["RAILWAY_SERVICE_ID", process.env.RAILWAY_SERVICE_ID],
    ["RAILWAY_PUBLIC_DOMAIN", process.env.RAILWAY_PUBLIC_DOMAIN],
    ["RAILWAY_STATIC_URL", process.env.RAILWAY_STATIC_URL],
    ["RAILWAY_PRIVATE_DOMAIN", process.env.RAILWAY_PRIVATE_DOMAIN],
    ["RAILWAY_GIT_REPO_NAME", process.env.RAILWAY_GIT_REPO_NAME],
    ["RAILWAY_DEPLOYMENT_ID", process.env.RAILWAY_DEPLOYMENT_ID],
  ];

  console.log(`[railway-target] candidates: ${namedCandidates.map(([name, value]) => describeCandidate(name, value)).join(" | ")}`);

  for (const [name, candidate] of namedCandidates) {
    const target = inferFromText(candidate);
    if (target) {
      console.log(`[railway-target] selected ${target} from ${name}`);
      return target;
    }
  }

  const fallback = process.env.KOGA_RAILWAY_TARGET_FALLBACK;
  const fallbackTarget = inferFromText(fallback);
  if (fallbackTarget) {
    console.warn(`[railway-target] Cannot infer target from Railway env. Falling back to ${fallbackTarget} from KOGA_RAILWAY_TARGET_FALLBACK.`);
    return fallbackTarget;
  }

  throw new Error([
    "Cannot infer Railway target.",
    "Set KOGA_RAILWAY_TARGET to one of: api, admin-web, owner-web, customer-web.",
    "For the customer portal service, set KOGA_RAILWAY_TARGET=customer-web.",
    "Refusing to silently fall back to api because that can start the wrong app.",
  ].join(" "));
}

export function commandForTarget(target, phase) {
  const commands = {
    api: {
      build: "corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm db:generate:postgres && pnpm --filter @koga/api build",
      start: "corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm --filter @koga/api start",
    },
    "admin-web": {
      build: "corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm --filter @koga/admin-web build",
      start: "corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm --filter @koga/admin-web start",
    },
    "owner-web": {
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
