import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const prisma = new PrismaClient();

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

async function cleanDemoOrg(orgId: string) {
  await prisma.platformInvoice.deleteMany({ where: { organizationId: orgId } });
  await prisma.platformSubscription.deleteMany({ where: { organizationId: orgId } });
  await prisma.integrationConnector.deleteMany({ where: { organizationId: orgId } });
  await prisma.storeOnboardingStep.deleteMany({ where: { organizationId: orgId } });
  await prisma.auditLog.deleteMany({ where: { organizationId: orgId } });
  await prisma.deviceAction.deleteMany({ where: { device: { organizationId: orgId } } });
  await prisma.deviceEvent.deleteMany({ where: { device: { organizationId: orgId } } });
  await prisma.payment.deleteMany({ where: { organizationId: orgId } });
  await prisma.consent.deleteMany({ where: { customer: { organizationId: orgId } } });
  await prisma.installment.deleteMany({ where: { contract: { organizationId: orgId } } });
  await prisma.contract.deleteMany({ where: { organizationId: orgId } });
  await prisma.contactLog.deleteMany({ where: { customer: { organizationId: orgId } } });
  await prisma.device.deleteMany({ where: { organizationId: orgId } });
  await prisma.customer.deleteMany({ where: { organizationId: orgId } });
  await prisma.branch.deleteMany({ where: { organizationId: orgId } });
  await prisma.user.deleteMany({ where: { organizationId: orgId } });
}

async function main() {
  const email = process.env.ADMIN_SAMPLE_EMAIL ?? "sample-owner@local.test";
  const password = process.env.ADMIN_SAMPLE_PASSWORD ?? "LocalSample1234!";
  const passwordHash = await bcrypt.hash(password, 10);
  const orgId = "demo_org";

  await prisma.organization.upsert({
    where: { id: orgId },
    update: { name: "KOGA Phone Lease Demo Store", slug: "demo-store", storeCode: "STORE-DEMO", ownerName: "Demo Owner", email, billingEmail: email, phone: "020000000", status: "ACTIVE", plan: "PRO", billingStatus: "CURRENT", monthlyFee: 3990 },
    create: { id: orgId, name: "KOGA Phone Lease Demo Store", slug: "demo-store", storeCode: "STORE-DEMO", ownerName: "Demo Owner", email, billingEmail: email, phone: "020000000", status: "ACTIVE", plan: "PRO", billingStatus: "CURRENT", monthlyFee: 3990 },
  });

  await cleanDemoOrg(orgId);

  const org = await prisma.organization.update({ where: { id: orgId }, data: {} });
  const today = new Date();

  await prisma.platformSubscription.create({
    data: { organizationId: org.id, plan: "PRO", status: "CURRENT", monthlyFee: 3990, deviceLimit: 500, storeUserLimit: 50, currentPeriodStart: today, currentPeriodEnd: addMonths(today, 1) },
  });

  await prisma.platformInvoice.create({
    data: { organizationId: org.id, invoiceNo: "INV-DEMO-000001", periodLabel: today.toISOString().slice(0, 7), amount: 3990, status: "PAID", dueDate: addMonths(today, 1), paidAt: today, paymentRef: "DEMO-PLATFORM-PAY" },
  });

  const integrationItems = [
    ["ANDROID_MANAGEMENT", "MDM", "Android Management API", "SETUP_REQUIRED"],
    ["APPLE_BUSINESS_MANAGER", "MDM", "Apple Business Manager / ADE", "SETUP_REQUIRED"],
    ["PROMPTPAY_MANUAL", "PAYMENT", "PromptPay Manual", "ACTIVE"],
    ["LINE_MESSAGING", "NOTIFICATION", "LINE Messaging API", "SETUP_REQUIRED"],
    ["STORAGE_S3_R2", "STORAGE", "S3/R2 Storage", "SETUP_REQUIRED"],
  ] as const;
  for (const [provider, category, displayName, status] of integrationItems) {
    await prisma.integrationConnector.create({ data: { organizationId: org.id, provider: provider as any, category: category as any, displayName, status: status as any, configJson: {} } });
  }

  const onboardingItems = [
    ["profile", "ตั้งค่าข้อมูลร้าน", "DONE"],
    ["devices", "เพิ่มสต็อกเครื่อง", "DONE"],
    ["contracts", "สร้างสัญญาเช่าใช้", "DONE"],
    ["payment", "ตั้งค่ารับเงิน", "DONE"],
    ["notification", "ตั้งค่าแจ้งเตือน", "PENDING"],
    ["mdm", "เชื่อม Android/iOS MDM", "PENDING"],
    ["legal", "ตรวจสัญญาและ PDPA", "PENDING"],
  ] as const;
  for (let i = 0; i < onboardingItems.length; i++) {
    const [stepKey, title, status] = onboardingItems[i];
    await prisma.storeOnboardingStep.create({ data: { organizationId: org.id, stepKey, title, status: status as any, sortOrder: i + 1, completedAt: status === "DONE" ? today : undefined } });
  }

  const user = await prisma.user.create({
    data: {
      organizationId: org.id,
      email,
      passwordHash,
      name: "Demo Admin",
      role: "OWNER",
    },
  });

  await prisma.branch.create({
    data: {
      id: "demo_branch",
      organizationId: org.id,
      name: "สาขาหลัก",
      phone: "020000000",
      address: "Bangkok",
    },
  });

  const activeCustomer = await prisma.customer.create({
    data: { organizationId: org.id, fullName: "สมชาย ตัวอย่าง", phone: "0812345678", address: "กรุงเทพฯ", riskScore: 12 },
  });
  const activeDevice = await prisma.device.create({
    data: { organizationId: org.id, brand: "Samsung", model: "Galaxy A55", imei: "359999999999991", serialNumber: "DEMO-A55-001", storage: "128GB", color: "Black", platform: "ANDROID", deviceStatus: "LEASE_ACTIVE", controlStatus: "ENROLLED" },
  });
  const activeContract = await prisma.contract.create({
    data: {
      organizationId: org.id,
      customerId: activeCustomer.id,
      deviceId: activeDevice.id,
      contractNo: "CT-DEMO-000001",
      salePrice: 12900,
      downPayment: 2900,
      principalAmount: 10000,
      interestAmount: 1200,
      totalAmount: 11200,
      installmentCount: 4,
      status: "ACTIVE",
      signedAt: today,
      installments: {
        create: Array.from({ length: 4 }).map((_, index) => ({
          installmentNo: index + 1,
          dueDate: addMonths(today, index),
          amount: 2800,
          paidAmount: 0,
          status: index === 0 ? "DUE_SOON" : "PENDING",
        })),
      },
      consents: { create: ["INSTALLMENT_CONTRACT", "LEASE_TO_OWN_TERMS", "OWNERSHIP_RETENTION", "PAYMENT_REMINDER", "DEVICE_MANAGEMENT", "DATA_PROCESSING", "RELEASE_PROCESS"].map((type) => ({ customerId: activeCustomer.id, type: type as any, version: "lease-a-1" })) },
    },
  });

  const overdueCustomer = await prisma.customer.create({
    data: { organizationId: org.id, fullName: "มานะ ค้างงวด", phone: "0891112222", address: "นนทบุรี", riskScore: 72, status: "WATCHLIST" },
  });
  const overdueDevice = await prisma.device.create({
    data: { organizationId: org.id, brand: "OPPO", model: "Reno 11", imei: "359999999999992", serialNumber: "DEMO-RENO-002", storage: "256GB", color: "Blue", platform: "ANDROID", deviceStatus: "LEASE_ACTIVE", controlStatus: "ENROLLED" },
  });
  const overdueDue = new Date(today);
  overdueDue.setDate(today.getDate() - 18);
  const overdueContract = await prisma.contract.create({
    data: {
      organizationId: org.id,
      customerId: overdueCustomer.id,
      deviceId: overdueDevice.id,
      contractNo: "CT-DEMO-OVERDUE",
      salePrice: 15900,
      downPayment: 1900,
      principalAmount: 14000,
      interestAmount: 1600,
      totalAmount: 15600,
      installmentCount: 6,
      status: "REVIEW_REQUIRED",
      signedAt: addMonths(today, -2),
      installments: {
        create: [
          { installmentNo: 1, dueDate: addMonths(today, -1), amount: 2600, paidAmount: 2600, status: "PAID", paidAt: addMonths(today, -1) },
          { installmentNo: 2, dueDate: overdueDue, amount: 2600, paidAmount: 0, status: "OVERDUE" },
          { installmentNo: 3, dueDate: addMonths(today, 1), amount: 2600, paidAmount: 0, status: "PENDING" },
          { installmentNo: 4, dueDate: addMonths(today, 2), amount: 2600, paidAmount: 0, status: "PENDING" },
          { installmentNo: 5, dueDate: addMonths(today, 3), amount: 2600, paidAmount: 0, status: "PENDING" },
          { installmentNo: 6, dueDate: addMonths(today, 4), amount: 2600, paidAmount: 0, status: "PENDING" },
        ],
      },
      consents: { create: ["INSTALLMENT_CONTRACT", "LEASE_TO_OWN_TERMS", "OWNERSHIP_RETENTION", "PAYMENT_REMINDER", "DEVICE_MANAGEMENT", "DATA_PROCESSING", "RELEASE_PROCESS"].map((type) => ({ customerId: overdueCustomer.id, type: type as any, version: "lease-a-1" })) },
    },
  });

  await prisma.deviceAction.createMany({
    data: [
      { deviceId: overdueDevice.id, contractId: overdueContract.id, type: "SEND_REMINDER", reason: "แจ้งเตือนค้างชำระงวดที่ 2 เกิน 18 วัน", status: "PENDING_APPROVAL" },
      { deviceId: overdueDevice.id, contractId: overdueContract.id, type: "REQUEST_LIMITED_MODE", reason: "ค้างชำระเกิน 14 วัน ต้อง review ก่อนดำเนินการจำกัดการใช้งานตามสัญญา Lease-to-own ผ่าน provider ที่ถูกต้อง", status: "PENDING_APPROVAL" },
    ],
  });

  const paidCustomer = await prisma.customer.create({
    data: { organizationId: org.id, fullName: "ศิริพร จ่ายครบ", phone: "0865557777", address: "ปทุมธานี", riskScore: 5 },
  });
  const paidDevice = await prisma.device.create({
    data: { organizationId: org.id, brand: "Xiaomi", model: "Redmi Note 13", imei: "359999999999993", serialNumber: "DEMO-REDMI-003", storage: "128GB", color: "White", platform: "ANDROID", deviceStatus: "PAID_OFF", controlStatus: "RELEASE_PENDING" },
  });
  const paidContract = await prisma.contract.create({
    data: {
      organizationId: org.id,
      customerId: paidCustomer.id,
      deviceId: paidDevice.id,
      contractNo: "CT-DEMO-PAIDOFF",
      salePrice: 6900,
      downPayment: 900,
      principalAmount: 6000,
      interestAmount: 600,
      totalAmount: 6600,
      installmentCount: 3,
      status: "PAID_OFF",
      legalTitleStatus: "TRANSFER_PENDING",
      signedAt: addMonths(today, -4),
      paidOffAt: today,
      releaseDueAt: today,
      installments: { create: [1, 2, 3].map((n) => ({ installmentNo: n, dueDate: addMonths(today, -4 + n), amount: 2200, paidAmount: 2200, status: "PAID", paidAt: addMonths(today, -4 + n) })) },
      consents: { create: ["INSTALLMENT_CONTRACT", "LEASE_TO_OWN_TERMS", "OWNERSHIP_RETENTION", "PAYMENT_REMINDER", "DEVICE_MANAGEMENT", "DATA_PROCESSING", "RELEASE_PROCESS"].map((type) => ({ customerId: paidCustomer.id, type: type as any, version: "lease-a-1" })) },
    },
  });

  await prisma.payment.createMany({
    data: [
      { organizationId: org.id, contractId: paidContract.id, amount: 2200, method: "BANK_TRANSFER", status: "CONFIRMED", paidAt: addMonths(today, -3), providerRef: "DEMO-PAY-001" },
      { organizationId: org.id, contractId: paidContract.id, amount: 2200, method: "BANK_TRANSFER", status: "CONFIRMED", paidAt: addMonths(today, -2), providerRef: "DEMO-PAY-002" },
      { organizationId: org.id, contractId: paidContract.id, amount: 2200, method: "BANK_TRANSFER", status: "CONFIRMED", paidAt: addMonths(today, -1), providerRef: "DEMO-PAY-003" },
    ],
  });

  await prisma.deviceAction.create({ data: { deviceId: paidDevice.id, contractId: paidContract.id, type: "REQUEST_RELEASE", reason: "ลูกค้าชำระครบทุกงวดแล้ว ต้องปลดการจัดการอุปกรณ์", status: "PENDING_APPROVAL" } });

  await prisma.contactLog.create({ data: { customerId: overdueCustomer.id, channel: "PHONE", message: "โทรแจ้งเตือนงวดค้าง ลูกค้าขอเลื่อนจ่ายภายในสัปดาห์นี้", createdBy: user.id } });

  await prisma.auditLog.create({
    data: { organizationId: org.id, actorId: user.id, action: "SEED_READY_MVP_DATA", targetType: "Organization", targetId: org.id, metadata: { contracts: [activeContract.contractNo, overdueContract.contractNo, paidContract.contractNo] } },
  });

  console.log("Seed complete");
  console.log(`Admin: ${email} / ${password}`);
  console.log(`Customer portal: contractNo=${activeContract.contractNo}, phone=${activeCustomer.phone}`);
  console.log("Extra sample contracts: CT-DEMO-OVERDUE / 0891112222, CT-DEMO-PAIDOFF / 0865557777");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
