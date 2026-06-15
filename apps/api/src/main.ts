import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { PORT, IS_PRODUCTION, ALLOWED_ORIGINS, fail } from "./core/app-context";
import { registerApiModules } from "./modules/register-modules";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const app = Fastify({ logger: true });

await app.register(cors, {
  origin(origin, cb) {
    if (!IS_PRODUCTION || !origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS origin blocked: ${origin}`), false);
  },
  credentials: true,
});



await registerApiModules(app);

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  return fail(reply, 500, "INTERNAL_ERROR", error.message || "Internal server error");
});

app.listen({ port: PORT, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
