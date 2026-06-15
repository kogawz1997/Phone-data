import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apiPath = path.join(root, "apps/api/src/main.ts");
const schemaPath = path.join(root, "packages/db/prisma/schema.prisma");
const api = fs.readFileSync(apiPath, "utf8");
const schema = fs.readFileSync(schemaPath, "utf8");

const criticalModels = [
  "Customer", "Device", "Contract", "Installment", "Payment", "CustomerPortalUser",
  "CustomerPaymentRequest", "AppleCustodyRecord", "MdmEnrollment", "MdmPolicy",
  "StoreLedgerEntry", "CollectionTask", "DisputeCase", "ConsentDocumentSnapshot",
  "AutomationRule", "IntegrationConnector"
];

const missingOrg = [];
for (const model of criticalModels) {
  const match = schema.match(new RegExp(`model\\s+${model}\\s+{([\\s\\S]*?)\\n}`));
  if (!match) {
    missingOrg.push(`${model}: model not found`);
    continue;
  }
  if (!/organizationId\s+String/.test(match[1])) missingOrg.push(`${model}: missing organizationId`);
}

const routeWarnings = [];
const routeBlocks = api.split(/\napp\.(?:get|post|patch|put|delete)\(/).slice(1);
for (const block of routeBlocks) {
  const route = (block.match(/^"([^"]+)"/) || [])[1] || "unknown";
  if (route.startsWith("/platform") || route.startsWith("/portal") || route.startsWith("/auth") || route.startsWith("/public") || route.startsWith("/health") || route.startsWith("/uploads") || route.startsWith("/ops")) continue;
  if (/prisma\.(customer|device|contract|payment|installment|customerPaymentRequest|customerPortalUser|appleCustodyRecord|collectionTask|disputeCase|storeLedgerEntry|integrationConnector)/.test(block) && !/organizationId:\s*user\.organizationId/.test(block)) {
    routeWarnings.push(`${route}: check organizationId tenant filter manually`);
  }
}

console.log("Tenant isolation check");
console.log(`Critical models checked: ${criticalModels.length}`);
if (missingOrg.length) console.log("Model issues:\n" + missingOrg.map(x => `- ${x}`).join("\n"));
if (routeWarnings.length) console.log("Route review warnings:\n" + routeWarnings.map(x => `- ${x}`).join("\n"));
if (missingOrg.length) process.exit(1);
console.log(routeWarnings.length ? "Passed with route review warnings." : "Passed.");
