import type { FastifyInstance } from "fastify";
import type { AuthedRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

function formatLoginValidationMessage(issues: Array<{ path: Array<string | number>; message?: string }>) {
  const missing = new Set(issues.map((issue) => String(issue.path?.[0] ?? "")));
  if (missing.has("email") && missing.has("password")) return "กรุณากรอกอีเมลและรหัสผ่าน";
  if (missing.has("email")) return "กรุณากรอกอีเมล";
  if (missing.has("password")) return "กรุณากรอกรหัสผ่าน";
  return "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
}

function buildSessionCookie(token: string, isProduction: boolean) {
  const name = process.env.AUTH_COOKIE_NAME || "koga_session";
  const maxAge = 7 * 24 * 60 * 60;
  const parts = [
    `${name}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (isProduction) parts.push("Secure");
  return parts.join("; ");
}

function buildClearSessionCookie(isProduction: boolean) {
  const name = process.env.AUTH_COOKIE_NAME || "koga_session";
  const parts = [
    `${name}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (isProduction) parts.push("Secure");
  return parts.join("; ");
}

export async function registerAuthRoutes(app: FastifyInstance) {
  const {
    prisma,
    bcrypt,
    signSession,
    loginSchema,
    JWT_SECRET,
    IS_PRODUCTION,
    rateLimit,
    cleanEmptyStrings,
    fail,
    ok,
    requireAuth,
    audit,
    getPermissionsForRole,
  } = ctx;

  app.post("/auth/login", async (request, reply) => {
    if (!rateLimit(request, reply, "login", 10, 60_000)) return;
    const parsed = loginSchema.safeParse(cleanEmptyStrings(request.body));
    if (!parsed.success) return fail(reply, 400, "BAD_REQUEST", formatLoginValidationMessage(parsed.error.issues));

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) return fail(reply, 401, "INVALID_LOGIN", "อีเมลหรือรหัสผ่านไม่ถูกต้อง");

    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) return fail(reply, 401, "INVALID_LOGIN", "อีเมลหรือรหัสผ่านไม่ถูกต้อง");

    const sessionUser = {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = signSession(sessionUser, JWT_SECRET);
    reply.header("Set-Cookie", buildSessionCookie(token, IS_PRODUCTION));

    await audit({ organizationId: user.organizationId, actorId: user.id, action: "LOGIN", targetType: "User", targetId: user.id });

    // token is returned for old clients during migration, but web apps now rely on the HttpOnly cookie.
    return ok({ token, user: sessionUser });
  });

  app.post("/auth/logout", async (_request, reply) => {
    reply.header("Set-Cookie", buildClearSessionCookie(IS_PRODUCTION));
    return ok({ loggedOut: true });
  });

  app.get("/auth/me", { preHandler: requireAuth }, async (request) => ok((request as AuthedRequest).user));

  app.get("/auth/permissions", { preHandler: requireAuth }, async (request) => {
    const user = (request as AuthedRequest).user;
    return ok({ role: user.role, permissions: getPermissionsForRole(user.role) });
  });
}
