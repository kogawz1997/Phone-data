import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: "../../.env" });
dotenv.config();

const prisma = new PrismaClient();

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for production bootstrap`);
  return value;
}

async function main() {
  const orgName = required("ORG_NAME");
  const adminEmail = required("ADMIN_EMAIL").toLowerCase();
  const adminPassword = required("ADMIN_PASSWORD");
  const adminName = process.env.ADMIN_NAME?.trim() || "Owner Admin";

  if (adminPassword.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters for production use");
  }

  const org = await prisma.organization.upsert({
    where: { id: process.env.ORG_ID || "default_org" },
    create: {
      id: process.env.ORG_ID || "default_org",
      name: orgName,
      slug: process.env.ORG_SLUG || "platform",
      storeCode: process.env.ORG_STORE_CODE || "PLATFORM",
      ownerName: adminName,
      email: adminEmail,
      billingEmail: adminEmail,
      taxId: process.env.ORG_TAX_ID,
      phone: process.env.ORG_PHONE,
      status: "ACTIVE",
      plan: "ENTERPRISE",
      billingStatus: "CURRENT",
      monthlyFee: 0,
    },
    update: {
      name: orgName,
      slug: process.env.ORG_SLUG || "platform",
      storeCode: process.env.ORG_STORE_CODE || "PLATFORM",
      ownerName: adminName,
      email: adminEmail,
      billingEmail: adminEmail,
      taxId: process.env.ORG_TAX_ID,
      phone: process.env.ORG_PHONE,
      status: "ACTIVE",
      plan: "ENTERPRISE",
      billingStatus: "CURRENT",
      monthlyFee: 0,
    },
  });

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      organizationId: org.id,
      email: adminEmail,
      passwordHash,
      name: adminName,
      role: "PLATFORM_OWNER",
    },
    update: {
      organizationId: org.id,
      passwordHash,
      name: adminName,
      role: "PLATFORM_OWNER",
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      actorId: user.id,
      action: "BOOTSTRAP_PRODUCTION_ADMIN",
      targetType: "User",
      targetId: user.id,
      metadata: { email: adminEmail },
    },
  });

  console.log(`Platform organization ready: ${org.name}`);
  console.log(`Platform owner ready: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
