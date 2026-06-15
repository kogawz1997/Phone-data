const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.PUBLIC_API_URL || "http://localhost:4000";

if (!email || !password) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD are required for smoke test.");
  process.exit(1);
}

async function main() {
  const health = await fetch(`${base}/health`).then((r) => r.json());
  if (!health.ok) throw new Error("health check failed");

  const loginRes = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const login = await loginRes.json();
  if (!login.ok) throw new Error(`login failed: ${JSON.stringify(login)}`);

  const token = login.data.token;
  const headers = { Authorization: `Bearer ${token}` };
  const endpoints = ["/reports/summary", "/customers", "/devices", "/contracts", "/device-actions", "/ops/readiness"];
  for (const endpoint of endpoints) {
    const res = await fetch(`${base}${endpoint}`, { headers });
    const json = await res.json();
    if (!json.ok) throw new Error(`${endpoint} failed: ${JSON.stringify(json)}`);
    console.log(`OK ${endpoint}`);
  }
  console.log("Smoke test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
