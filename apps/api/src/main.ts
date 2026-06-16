import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { PORT, IS_PRODUCTION, ALLOWED_ORIGINS, JWT_SECRET, fail, getUserFromRequest, isPlatformOwner } from "./core/app-context";
import { registerApiModules } from "./modules/register-modules";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

if (!process.env.PAYMENT_WEBHOOK_SECRET && process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET) {
  process.env.PAYMENT_WEBHOOK_SECRET = process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET;
}

const SESSION_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "koga_session";
const listenPort = Number(process.env.PORT ?? process.env.API_PORT ?? PORT);
const RAILWAY_DEPLOYMENT_ORIGINS = [
  "https://kogaadmin-web-production.up.railway.app",
  "https://kogacustomer-web-production.up.railway.app",
];

function normalizeOrigin(origin: string) {
  const cleaned = origin.trim().replace(/^['\"]+|['\"]+$/g, "").replace(/\/+$/, "");
  try {
    return new URL(cleaned).origin.toLowerCase();
  } catch {
    return cleaned.toLowerCase();
  }
}

function isRailwayFrontendOrigin(origin: string) {
  const value = normalizeOrigin(origin);
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".up.railway.app") &&
      (url.hostname.includes("admin-web") || url.hostname.includes("customer-web") || url.hostname.includes("kogaadmin") || url.hostname.includes("kogacustomer"))
    );
  } catch {
    return false;
  }
}

const normalizedAllowedOrigins = new Set([...ALLOWED_ORIGINS, ...RAILWAY_DEPLOYMENT_ORIGINS].map(normalizeOrigin));

function readCookieValue(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return "";
  const pair = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  if (!pair) return "";
  return decodeURIComponent(pair.slice(name.length + 1));
}

function isPlatformMdmSetupRoute(method: string, url: string) {
  if (!["POST", "PUT", "PATCH"].includes(method)) return false;
  return (
    url.startsWith("/mdm/android/signup-url") ||
    url.startsWith("/mdm/android/enterprise") ||
    url.startsWith("/mdm/android/policies/") ||
    url.startsWith("/mdm/apple/policies/") ||
    url.startsWith("/mdm/apple/abm/sync") ||
    (url.startsWith("/devices/") && url.includes("/mdm/bind"))
  );
}

function assertProductionHardening() {
  if (!IS_PRODUCTION) return;

  const problems: string[] = [];
  if (!JWT_SECRET || JWT_SECRET === "change-this-in-production" || JWT_SECRET.length < 32) {
    problems.push("JWT_SECRET must be set to a strong value with at least 32 characters");
  }
  if (normalizedAllowedOrigins.size === 0) {
    problems.push("ALLOWED_ORIGINS or ADMIN_WEB_URL/CUSTOMER_WEB_URL must be set in production");
  }
  if (!Number.isFinite(listenPort) || listenPort <= 0) {
    problems.push("PORT or API_PORT must be a valid TCP port");
  }

  if (problems.length) {
    throw new Error(`Production hardening failed: ${problems.join("; ")}`);
  }
}

assertProductionHardening();

const app = Fastify({ logger: true });

await app.register(cors, {
  origin(origin, cb) {
    if (!IS_PRODUCTION || !origin || normalizedAllowedOrigins.has(normalizeOrigin(origin)) || isRailwayFrontendOrigin(origin)) {
      return cb(null, true);
    }
    app.log.warn({ origin, allowedOrigins: Array.from(normalizedAllowedOrigins) }, "CORS origin blocked");
    return cb(new Error(`CORS origin blocked: ${origin}`), false);
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-koga-webhook-secret"],
});

app.addHook("preHandler", async (request, reply) => {
  const cookieToken = readCookieValue(request.headers.cookie, SESSION_COOKIE_NAME);
  if (cookieToken && !request.headers.authorization) {
    request.headers.authorization = `Bearer ${cookieToken}`;
  }

  if (IS_PRODUCTION && request.method === "POST" && request.url.startsWith("/payments/webhook") && !process.env.PAYMENT_WEBHOOK_SECRET) {
    return fail(reply, 500, "WEBHOOK_SECRET_MISSING", "PAYMENT_WEBHOOK_SECRET is required before enabling payment webhooks in production");
  }

  if (isPlatformMdmSetupRoute(request.method, request.url)) {
    const user = await getUserFromRequest(request, reply);
    if (!user) return;
    if (!isPlatformOwner(user)) {
      return fail(reply, 403, "PLATFORM_OWNER_REQUIRED", "MDM provider key/cert setup is handled by Platform Owner only. Store users can only generate customer enrollment.");
    }
  }
});

await registerApiModules(app);

app.setErrorHandler((error, _request, reply) => {
  const message = error instanceof Error ? error.message : "Internal server error";
  return fail(reply, 500, "INTERNAL_ERROR", message);
});

app.listen({ port: listenPort, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
