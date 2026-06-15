import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { PORT, IS_PRODUCTION, ALLOWED_ORIGINS, JWT_SECRET, fail } from "./core/app-context";
import { registerApiModules } from "./modules/register-modules";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const SESSION_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "koga_session";

function readCookieValue(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return "";
  const pair = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  if (!pair) return "";
  return decodeURIComponent(pair.slice(name.length + 1));
}

function assertProductionHardening() {
  if (!IS_PRODUCTION) return;

  const problems: string[] = [];
  if (!JWT_SECRET || JWT_SECRET === "change-this-in-production" || JWT_SECRET.length < 32) {
    problems.push("JWT_SECRET must be set to a strong value with at least 32 characters");
  }
  if (ALLOWED_ORIGINS.length === 0) {
    problems.push("ALLOWED_ORIGINS or ADMIN_WEB_URL/CUSTOMER_WEB_URL must be set in production");
  }

  if (problems.length) {
    throw new Error(`Production hardening failed: ${problems.join("; ")}`);
  }
}

assertProductionHardening();

const app = Fastify({ logger: true });

await app.register(cors, {
  origin(origin, cb) {
    if (!IS_PRODUCTION || !origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS origin blocked: ${origin}`), false);
  },
  credentials: true,
});

app.addHook("preHandler", async (request, reply) => {
  const cookieToken = readCookieValue(request.headers.cookie, SESSION_COOKIE_NAME);
  if (cookieToken && !request.headers.authorization) {
    request.headers.authorization = `Bearer ${cookieToken}`;
  }

  if (IS_PRODUCTION && request.method === "POST" && request.url.startsWith("/payments/webhook") && !process.env.PAYMENT_WEBHOOK_SECRET) {
    return fail(reply, 500, "WEBHOOK_SECRET_MISSING", "PAYMENT_WEBHOOK_SECRET is required before enabling payment webhooks in production");
  }
});

await registerApiModules(app);

app.setErrorHandler((error, _request, reply) => {
  const message = error instanceof Error ? error.message : "Internal server error";
  return fail(reply, 500, "INTERNAL_ERROR", message);
});

app.listen({ port: PORT, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
