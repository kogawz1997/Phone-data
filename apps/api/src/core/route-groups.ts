export const API_ROUTE_GROUPS = [
  { group: "core", routes: ["GET /health", "GET /ops/readiness", "GET /ops/go-live-gates"] },
  { group: "auth", routes: ["POST /auth/login", "GET /auth/me", "GET /auth/permissions"] },
  { group: "platform", routes: ["GET /platform/summary", "GET /platform/stores", "PATCH /platform/stores/:id", "GET /platform/billing", "GET /platform/store-health"] },
  { group: "store", routes: ["POST /public/store-signup", "GET /store/profile", "PATCH /store/profile", "GET /store/users", "GET /store/onboarding"] },
  { group: "customers", routes: ["GET /customers", "POST /customers", "GET /customers/:id", "PATCH /customers/:id", "GET /customer-users"] },
  { group: "devices", routes: ["GET /devices", "POST /devices", "GET /devices/:id", "POST /devices/:id/mdm/bind"] },
  { group: "contracts", routes: ["GET /contracts", "POST /contracts", "GET /contracts/:id", "POST /contracts/:id/sign", "GET /contracts/:id/print"] },
  { group: "payments", routes: ["GET /payments", "POST /payments", "POST /payments/:id/confirm", "POST /payments/webhook", "GET /payment-requests"] },
  { group: "portal", routes: ["POST /portal/auth/login", "GET /portal/me", "GET /portal/contracts", "GET /portal/payment-requests"] },
  { group: "mdm", routes: ["GET /mdm/providers/status", "POST /mdm/android/enrollment-token", "POST /mdm/apple/enrollment-profile", "PUT /mdm/apple/connect"] },
  { group: "icloud-custody", routes: ["GET /apple-custody", "POST /devices/:id/apple-custody", "POST /apple-custody/:id/mark-released"] },
  { group: "collection", routes: ["GET /collection/tasks", "POST /collection/tasks", "PATCH /collection/tasks/:id"] },
  { group: "disputes", routes: ["GET /disputes", "POST /disputes", "PATCH /disputes/:id"] },
  { group: "templates", routes: ["GET /templates", "POST /templates/documents", "POST /templates/notifications"] },
  { group: "automation", routes: ["GET /automation/rules", "POST /automation/rules", "PATCH /automation/rules/:id"] },
  { group: "reports", routes: ["GET /reports/summary", "GET /reports/contracts.csv", "POST /reports/exports"] },
  { group: "integrations", routes: ["GET /integrations/catalog", "GET /integrations", "PATCH /integrations/:id", "POST /integrations/:id/test"] },
] as const;

export function countRoutes() {
  return API_ROUTE_GROUPS.reduce((sum, group) => sum + group.routes.length, 0);
}
