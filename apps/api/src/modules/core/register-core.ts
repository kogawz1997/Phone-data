import type { FastifyInstance } from "fastify";
import type { Prisma } from "@repo/db";
import type { AuthedRequest, CustomerPortalRequest } from "../../core/app-context";
import * as ctx from "../../core/app-context";

export async function registerCoreRoutes(app: FastifyInstance) {
  const {
    crypto,
    fs,
    path,
    bcrypt,
    QRCode,
    prisma,
    signSession,
    verifySession,
    createContractSchema,
    createCustomerSchema,
    createDeviceSchema,
    createPaymentSchema,
    loginSchema,
    calculateInstallments,
    generateContractNo,
    getOverdueLevel,
    createPromptPayEmvPayload,
    normalizePaymentAmount,
    assertSafeDeviceAction,
    buildUnsignedMdmMobileConfig,
    createAndroidProvider,
    createAppleProvider,
    createDeviceControlAdapter,
    getDualProviderStatus,
    sendNotification,
    getPermissionsForRole,
    API_ROUTE_GROUPS,
    countRoutes,
    deviceAdapter,
    JWT_SECRET,
    PORT,
    IS_PRODUCTION,
    ALLOWED_ORIGINS,
    rateLimit,
    constantTimeEquals,
    requireSharedSecret,
    envStatus,
    safeUploadName,
    saveBase64Upload,
    maybeSignMobileConfig,
    buildAppleCommandPlist,
    providerTypeForPlatform,
    providerNameFromEnv,
    buildDeviceContext,
    ok,
    cleanEmptyStrings,
    fail,
    getUserFromRequest,
    requireAuth,
    requireCustomerAuth,
    audit,
    isPlatformOwner,
    ensurePlatformOwner,
    makeSlug,
    planMonthlyFee,
    planDeviceLimit,
    addDays,
    customerPortalBaseUrl,
    makeCustomerPortalShareUrl,
    generateCustomerPin,
    buildPaymentQr,
    createDefaultOnboarding,
    integrationCatalog,
    ensureDefaultIntegrations,
    ensureDefaultOperationalTemplates,
    riskGradeFromScore,
    calculateCustomerRisk,
    buildStoreHealth,
    createInvoiceNo,
    csvEscape,
    toCsv,
    htmlEscape,
    formatThaiDate,
    formatBaht,
    renderContractHtml,
    recalculateContractStatus
  } = ctx as any;

app.addContentTypeParser(["application/xml", "text/xml", "application/x-apple-aspen-mdm-checkin"], { parseAs: "string" }, (_request, body, done) => {
  done(null, body);
});

app.get("/", async (_request, reply) => {
  const groups = Array.isArray(API_ROUTE_GROUPS) ? API_ROUTE_GROUPS : [];
  const routeCount = typeof countRoutes === "function" ? countRoutes() : groups.length;
  return reply.type("text/html; charset=utf-8").send(`<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>KOGA API</title>
  <style>
    :root{color-scheme:dark;--bg:#070a12;--panel:rgba(15,23,42,.82);--line:rgba(148,163,184,.18);--text:#eef2ff;--muted:#94a3b8;--brand:#38bdf8;--ok:#34d399}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--text);background:radial-gradient(circle at 10% 10%,rgba(56,189,248,.24),transparent 30%),radial-gradient(circle at 90% 0,rgba(129,140,248,.18),transparent 32%),linear-gradient(180deg,var(--bg),#0f172a)}
    main{width:min(980px,100%);margin:0 auto;padding:28px}.card{border:1px solid var(--line);border-radius:28px;background:var(--panel);backdrop-filter:blur(18px);padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.32)}
    .logo{width:52px;height:52px;border-radius:18px;display:grid;place-items:center;font-weight:1000;background:linear-gradient(145deg,#38bdf8,#818cf8);box-shadow:0 18px 46px rgba(56,189,248,.22)}
    .top{display:flex;gap:14px;align-items:center;margin-bottom:22px}h1{font-size:clamp(34px,7vw,76px);line-height:.94;letter-spacing:-.07em;margin:16px 0 12px}p{color:var(--muted);line-height:1.65}.badge{display:inline-flex;border-radius:999px;padding:8px 12px;background:rgba(52,211,153,.14);color:#bbf7d0;font-weight:900;font-size:13px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:18px}.mini{border:1px solid var(--line);border-radius:20px;padding:16px;background:rgba(2,6,23,.32)}.mini span{display:block;color:var(--muted);font-size:12px}.mini strong{display:block;margin-top:6px;font-size:26px}a{color:#bae6fd;text-decoration:none;font-weight:900}code{word-break:break-all;background:rgba(2,6,23,.66);border:1px solid var(--line);border-radius:10px;padding:3px 7px;color:#e0f2fe}@media(max-width:720px){main{padding:14px}.card{border-radius:22px;padding:18px}.grid{grid-template-columns:1fr}h1{font-size:42px}}
  </style>
</head>
<body>
  <main>
    <section class="card">
      <div class="top"><div class="logo">K</div><div><span class="badge">API ready</span><p style="margin:8px 0 0">KOGA Lease MDM SaaS backend</p></div></div>
      <h1>ระบบ API พร้อมใช้งาน</h1>
      <p>โดเมนนี้เป็น backend สำหรับ Admin Web และ Customer Portal ไม่ใช่หน้าใช้งานหลักโดยตรง เปิดหน้านี้แล้วไม่งง ดีกว่าเจอ JSON เปล่า ๆ แล้วมนุษย์เริ่มสงสัยชีวิต</p>
      <div class="grid">
        <div class="mini"><span>Health</span><strong><a href="/health">/health</a></strong></div>
        <div class="mini"><span>Route groups</span><strong>${groups.length}</strong></div>
        <div class="mini"><span>Routes</span><strong>${routeCount}</strong></div>
      </div>
      <p style="margin-top:18px">Admin API base URL: <code>${process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "this domain"}</code></p>
    </section>
  </main>
</body>
</html>`);
});

app.get("/health", async () => ok({ status: "ok", time: new Date().toISOString() }));


app.get("/uploads/:folder/:filename", async (request, reply) => {
  const { folder, filename } = request.params as { folder: string; filename: string };
  const uploadRoot = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads");
  const filePath = path.join(uploadRoot, safeUploadName(folder), safeUploadName(filename));
  if (!fs.existsSync(filePath)) return fail(reply, 404, "NOT_FOUND", "Upload not found");
  return reply.send(fs.createReadStream(filePath));
});


app.post("/uploads/base64", { preHandler: requireAuth }, async (request, reply) => {
  const user = (request as AuthedRequest).user;
  const body = cleanEmptyStrings(request.body) as { filename?: string; contentBase64?: string; folder?: string; targetType?: string; targetId?: string };
  if (!body.filename || !body.contentBase64) return fail(reply, 400, "BAD_REQUEST", "filename and contentBase64 are required");
  const saved = await saveBase64Upload({ filename: body.filename, contentBase64: body.contentBase64, folder: body.folder ?? "documents" });
  await audit({ organizationId: user.organizationId, actorId: user.id, action: "UPLOAD_FILE", targetType: body.targetType ?? "Upload", targetId: body.targetId ?? saved.url, metadata: { url: saved.url, size: saved.size, folder: body.folder } as Prisma.InputJsonObject });
  return ok(saved);
});

}