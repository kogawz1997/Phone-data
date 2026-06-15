# Code Structure Refactor Complete

ไฟล์นี้สรุปรอบรีแฟกเตอร์ที่ปิดงานให้ `apps/api/src/main.ts` เลิกแบกทั้งจักรวาลไว้คนเดียวแล้ว ไม่งั้นอีกหน่อยเปิดไฟล์ทีเดียวพัดลมโน้ตบุ๊กจะเหมือนกำลังขึ้นทางด่วน

## สถานะล่าสุด

- `apps/api/src/main.ts` เหลือประมาณ 35 บรรทัด
- Runtime routes ถูกย้ายออกเป็น module แล้ว
- Route inventory อ่านจากทุก module ได้ 126 routes
- `pnpm arch:check` ตรวจว่า route modules มีครบ
- `pnpm route:inventory` เขียน `docs/architecture/api-route-inventory.json` จาก module จริง

## โครง API ใหม่

```txt
apps/api/src/
├─ main.ts                         # สร้าง Fastify, CORS, register modules, error handler, listen
├─ core/
│  ├─ app-context.ts                # shared runtime helpers/context ที่ route modules ใช้ร่วมกัน
│  ├─ permissions.ts                # permission matrix
│  ├─ tenant.ts                     # tenant isolation helpers
│  ├─ route-groups.ts               # route map/domain grouping
│  ├─ errors.ts
│  └─ module-contract.ts
└─ modules/
   ├─ register-modules.ts           # register ทุก module ตามลำดับ
   ├─ core/
   ├─ auth/
   ├─ store/
   ├─ integrations/
   ├─ platform/
   ├─ customers/
   ├─ devices/
   ├─ apple-custody/
   ├─ contracts/
   ├─ payments/
   ├─ portal/
   ├─ mdm/
   ├─ collection/
   ├─ disputes/
   ├─ templates/
   ├─ automation/
   ├─ reports/
   └─ ops/
```

## Module ที่แยกแล้ว

| Module | หน้าที่หลัก |
|---|---|
| `core` | health, uploads, parser พื้นฐาน |
| `auth` | login, auth/permissions |
| `store` | profile ร้าน, users, onboarding, ledger, subscription |
| `integrations` | catalog/status/test integrations |
| `platform` | owner dashboard, stores, billing, settlements, MDM overview |
| `customers` | customers, portal users, contact logs, risk score |
| `devices` | device inventory |
| `apple-custody` | Legacy iCloud Custody workflow |
| `contracts` | lease-to-own contracts, sign/cancel/print |
| `payments` | payments, payment requests, QR, webhook, slip flow |
| `portal` | customer portal auth/contracts/payment requests |
| `mdm` | device actions, enrollments, Android/iOS MDM endpoints/webhooks |
| `collection` | collection tasks/overdue task generation |
| `disputes` | dispute center |
| `templates` | document/notification templates, consent snapshots |
| `automation` | automation rules |
| `reports` | summaries, CSV exports, audit logs/report exports |
| `ops` | readiness, go-live gates, jobs/cron, route-map |

## คำสั่งตรวจ

```bash
pnpm route:inventory
pnpm arch:check
pnpm tenant:check
pnpm final:check
```

## กฎสำคัญหลังจากนี้

1. route ใหม่ต้องอยู่ใน `apps/api/src/modules/<domain>/register-<domain>.ts`
2. ห้ามเพิ่ม route ธุรกิจเข้า `main.ts`
3. route ของร้านต้อง scope ด้วย `organizationId` เสมอ
4. route ของ Platform Owner ต้องใช้ `ensurePlatformOwner`
5. ถ้าเพิ่ม route ใหม่ ต้องรัน `pnpm route:inventory` เพื่ออัปเดต route map

## สิ่งที่ยังควรทำถ้ามีทีม dev ต่อ

- แยก service layer ออกจาก route modules เช่น `payments.service.ts`, `mdm.service.ts`
- เพิ่ม integration tests สำหรับ tenant isolation
- เพิ่ม typed request schemas ทุก route ด้วย Zod
- เพิ่ม provider-specific test suites สำหรับ Android/Apple/Payment

ตอนนี้โครง API ไม่ได้เป็นก้อนเดียวแล้ว แต่ยังคง runtime behavior เดิมไว้ให้มากที่สุดเพื่อไม่ให้รีแฟกเตอร์กลายเป็นพิธีเรียกบั๊กหมู่ ซึ่งเป็นงานอดิเรกที่มนุษย์ทำโดยไม่จำเป็นเลยสักนิด
