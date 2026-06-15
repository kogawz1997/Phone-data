export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true, service: "customer-web", time: new Date().toISOString() });
}
