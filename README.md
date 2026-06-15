# KOGA Lease MDM SaaS - Complete Refactor Final Pack

เวอร์ชันนี้คือรอบปิดโปรเจกต์: รวมระบบ SaaS หลายร้าน + ลูกค้าชำระงวด + Lease-to-own + Android/iOS MDM readiness + iCloud Custody + Platform Owner Billing + Risk/Collection/Dispute/Templates/Automation/Ledger/Settlement ครบในแพ็กเดียว


## Complete Refactor Update

รอบนี้แตก `apps/api/src/main.ts` ออกจากไฟล์รวม route ขนาดใหญ่เป็น module runtime จริงแล้ว:

```txt
apps/api/src/main.ts                 # bootstrap เท่านั้น
apps/api/src/core/app-context.ts      # shared helpers / guards / utilities
apps/api/src/modules/*/register-*.ts  # route modules แยกตาม domain
```

ตรวจแล้ว:

```txt
126 API routes inventoried across modules
19 route module files
main.ts เหลือประมาณ 35 บรรทัด
```

คำสั่งตรวจ:

```bash
pnpm route:inventory
pnpm arch:check
pnpm final:check
```

เอกสารรีแฟกเตอร์อยู่ที่ `docs/architecture/CODE_STRUCTURE_REFACTOR_TH.md` และ `docs/architecture/COMPLETE_REFACTOR_CHANGELOG_TH.md`

## หน้าสำคัญที่เพิ่มใน Final Pack

### Store Console
- `/collection` งานติดตามงวดค้าง
- `/risk` ประเมินความเสี่ยงลูกค้า
- `/disputes` เคสโต้แย้ง/ปัญหาลูกค้า
- `/templates` ศูนย์เทมเพลตสัญญา/PDPA/ข้อความแจ้งเตือน
- `/automation` กติกาแจ้งเตือน/สร้าง task อัตโนมัติ
- `/consents` consent snapshots
- `/reports` export รายงาน
- `/integrations` ตัวกรองระบบนอกของร้าน
- `/store/ledger` บัญชีรายการเงินเข้าร้าน

### Platform Owner
- `/platform/billing` ค่าบริการร้านและ invoice
- `/platform/store-health` คะแนนสุขภาพร้าน
- `/platform/integrations` สถานะระบบนอกของแต่ละร้าน
- `/platform/mdm/devices` เครื่อง MDM รวมทุก tenant
- `/platform/mdm/commands` คำสั่ง MDM รวมทุก tenant

## คำสั่งตรวจรอบสุดท้าย

```bash
pnpm final:check
```

อ่านเอกสารส่งมอบที่ `docs/FINAL_PRODUCTION_HANDOVER_TH.md` และ checklist ที่ `docs/GO_LIVE_MASTER_CHECKLIST_TH.md`

---

# KOGA Lease MDM SaaS Platform

ระบบนี้ถูกปรับเป็น **multi-tenant SaaS** สำหรับให้ร้านมือถือ/ร้านปล่อยเช่า/ร้านเช่าซื้อสมัครเข้ามาใช้ระบบบนเว็บเรา

โมเดลหลัก:

- **Platform Owner** = เจ้าของเว็บเรา ดูร้านทั้งหมด แพ็กเกจ ค่าบริการ ใบแจ้งหนี้ และ integration readiness
- **Store Owner / Staff** = ร้านที่มาเช่าใช้ระบบ เห็นเฉพาะลูกค้า เครื่อง สัญญา งวดชำระ และ MDM ของร้านตัวเอง
- **Customer Portal** = ลูกค้าร้านใช้เช็กสัญญาและแจ้งชำระ

ยังคงโมเดล **Lease-to-own + MDM consent**: ร้านถือกรรมสิทธิ์เครื่องก่อน ลูกค้าเซ็นสัญญา/consent ก่อนรับเครื่อง จ่ายครบแล้ว release MDM + โอนกรรมสิทธิ์

## โหมดใหม่ที่เพิ่ม

### 1) Platform Owner Dashboard

เปิดที่:

```txt
http://localhost:3000/platform
```

ทำได้:

- ดูร้านทั้งหมด
- ดู MRR โดยประมาณ
- ดูรายรับค่าระบบจาก invoice ที่ paid
- ดูร้าน trial / active / suspended
- กรองร้านตามสถานะ / แพ็กเกจ / billing
- สร้างใบแจ้งหนี้ค่าระบบให้ร้าน
- mark paid ใบแจ้งหนี้
- ระงับ/เปิดใช้งานร้าน
- export stores CSV
- ดูสถานะ integration ของร้านแต่ละร้าน

### 2) Store Signup

เปิดที่:

```txt
http://localhost:3000/signup
```

ร้านสมัครเองได้:

- ชื่อร้าน
- เจ้าของร้าน
- อีเมล/รหัสผ่าน
- เบอร์/ภาษี/ที่อยู่
- เลือกแพ็กเกจ Starter / Standard / Pro / Enterprise

ระบบจะสร้าง tenant แยกให้ร้านทันที พร้อม owner account, subscription, onboarding checklist และ integration placeholders

### 3) Store Onboarding + Integration Filter

เปิดที่:

```txt
http://localhost:3000/onboarding
```

ร้านใช้หน้านี้เพื่อเปิดงานจริง:

- ตั้งค่าข้อมูลร้าน
- เพิ่มสต็อกเครื่อง
- สร้างสัญญา
- ตั้งค่ารับเงิน
- เชื่อม LINE/SMS
- เชื่อม Android/iOS MDM
- ตรวจสัญญาและ PDPA

มีตัวกรองระบบนอก:

- MDM
- Payment
- Notification
- Storage
- Automation


### 4) Customer Payment Portal ต่อร้าน

เพิ่มระบบให้ร้านแต่ละ tenant เปิด user ให้ลูกค้าของร้านตัวเองได้ ลูกค้า login เข้า Customer Portal ด้วย `storeSlug + phone + PIN` แล้วดูงวด/วันครบกำหนด/QR ชำระเงินของร้านนั้นเท่านั้น

เปิดที่:

```txt
Store customer access: http://localhost:3000/customer-access
Store payment QR:     http://localhost:3000/payment-requests
Customer Portal:      http://localhost:3002
```

ทำได้:

- ร้านสร้าง Customer Portal User ให้ลูกค้า
- ระบบสร้างลิงก์เชิญ + PIN ชั่วคราว
- ร้านตั้ง PromptPay/บัญชีธนาคารของตัวเอง
- ร้านสร้าง QR/Payment Request ต่อสัญญา/งวด
- ลูกค้าดูงวดและ QR ใน portal
- ลูกค้าแนบสลิป
- ร้านกด Confirm/Reject แล้วระบบอัปเดตงวด
- Customer token เข้า API ร้านไม่ได้ กันข้อมูลปน tenant

อ่านเพิ่ม: `docs/customer-payment-portal-th.md`

## วิธีรัน Local

```bash
cd phone-finance-mdm-saas-platform
pnpm create:env
pnpm install
pnpm db:generate
pnpm db:push
pnpm bootstrap:prod
pnpm dev
```

ค่าบัญชี Platform Owner จะอยู่ใน `.env`:

```env
ADMIN_EMAIL="..."
ADMIN_PASSWORD="..."
```

หลังเข้าเว็บแล้ว:

- `/platform` สำหรับเจ้าของระบบ
- `/signup` สำหรับสมัครร้าน
- `/` สำหรับร้านที่ login เข้ามาใช้งาน
- `/onboarding` สำหรับร้านตั้งค่าเริ่มต้น

## วิธีเพิ่มข้อมูลตัวอย่าง

```bash
SEED_SAMPLE_DATA=true pnpm db:seed:sample
```

ข้อมูล sample จะสร้างร้าน demo หนึ่งร้านพร้อมลูกค้า เครื่อง สัญญา งวด และ integration checklist

## จุดเชื่อมของจริงที่เตรียมไว้

### Android

- Android Management API
- Enterprise signup URL
- Enrollment token
- Policy publish
- Device command
- Android webhook shared secret

### iOS

- Apple Business Manager
- ADE server token
- APNs MDM certificate
- `.mobileconfig` endpoint
- `/mdm/apple/checkin`
- `/mdm/apple/connect`
- Apple command queue

### Payment / Notification / Storage

- Payment webhook
- Upload endpoint
- LINE/Webhook notification provider
- S3/R2 placeholder ผ่าน env

## สิ่งที่ยังต้องทำข้างนอกระบบ

- สมัคร Google Cloud และเปิด Android Management API
- สร้าง Android Enterprise จริง
- สมัคร Apple Business Manager
- สร้าง APNs MDM Push Certificate
- ใช้เครื่อง Android/iPhone จริงทดสอบ enroll/release
- ต่อ payment gateway จริง
- ต่อ storage จริง
- ให้ทนายตรวจสัญญา lease-to-own, MDM consent และ PDPA

ระบบนี้เตรียมงานให้เป็น SaaS จริงแล้ว แต่ไม่ได้โกหกว่าใส่ zip แล้วกลายเป็น Apple/Samsung partner ทันที โลกยังไม่ได้ใจดีขนาดนั้น 🫠

## Legacy iCloud Custody Mode

เพิ่มโหมดสำหรับร้านที่มีเครื่อง iPhone/iPad ที่ใช้ iCloud ร้านอยู่แล้ว และต้องการนำเครื่องเข้า workflow การเงิน/สัญญา/งวด/ปลดเครื่องในระบบหลัก

หน้าใหม่:

```txt
/apple-custody
/platform/apple-custody-risk
```

API ใหม่:

```txt
GET  /apple-custody
POST /devices/:id/apple-custody
PATCH /apple-custody/:id
POST /apple-custody/:id/mark-release-due
POST /apple-custody/:id/mark-released
GET  /platform/apple-custody-risk
```

อ่านเพิ่ม:

```txt
docs/apple-icloud-custody-mode-th.md
templates/icloud-custody-consent-th.md
```

โหมดนี้ไม่เก็บรหัสผ่าน Apple ID, 2FA, recovery key และไม่ใช่ระบบ bypass Activation Lock

## All Systems Update

เวอร์ชันนี้รวมระบบที่ลิสไว้ก่อนหน้าแล้ว ได้แก่ Platform Settlement, Store Ledger, Customer Risk Score, Collection Workspace, Dispute Center, Template Center, Automation Rules, Consent Snapshot, Store Health Score, Report Export และ Platform MDM Summary

อ่านเพิ่ม:

- `docs/all-systems-implementation-th.md`
- `docs/next-production-checklist-th.md`

## 2026-06 Refactor Pack

รอบนี้เพิ่มโครงสร้างสำหรับดูแลระยะยาว:

- `apps/api/src/core/permissions.ts` รวม permission matrix
- `apps/api/src/core/tenant.ts` รวม tenant isolation helpers
- `apps/api/src/core/route-groups.ts` รวม route map ตาม domain
- `apps/api/src/modules/*` วาง module boundary สำหรับย้าย route ออกจาก `main.ts`
- `apps/admin-web/src/components/*` เพิ่ม reusable UI components
- `apps/customer-web/src/components/*` เพิ่ม reusable customer components
- `docs/architecture/*` เพิ่มเอกสารโครงสร้างและ route inventory
- `pnpm route:inventory` สร้าง route inventory จาก API จริง
- `pnpm arch:check` ตรวจโครงสร้างสำคัญก่อนส่งต่อ dev

คำสั่งแนะนำหลังแตกไฟล์:

```bash
pnpm route:inventory
pnpm arch:check
pnpm tenant:check
pnpm final:check
```

หมายเหตุ: route runtime ยังอยู่ใน `apps/api/src/main.ts` เพื่อไม่ให้ behavior เดิมพังระหว่างรีแฟกเตอร์ รอบต่อไปควรย้าย route ทีละ module ตาม `docs/architecture/CODE_STRUCTURE_REFACTOR_TH.md`.

## External-ready update

รอบนี้เพิ่มชุดเตรียมระบบนอกให้พร้อมขึ้น:

- Integration Hub มี readiness score และปุ่มทดสอบทีละระบบ/ทดสอบทั้งหมด
- Platform Owner เห็น readiness ของทุกร้านจาก `/platform/integrations`
- เพิ่ม API:
  - `GET /integrations/readiness`
  - `GET /integrations/:id/setup-plan`
  - `POST /integrations/:id/test`
  - `POST /integrations/test-all`
  - `GET /platform/integrations/readiness`
- เพิ่ม package `@repo/storage` สำหรับ local upload และ storage setup validation
- เพิ่ม payment helper สำหรับ PromptPay validation, gateway setup, slip verification setup และ webhook signature helper
- เพิ่ม script:

```bash
pnpm external:check
```

ไฟล์คู่มือใหม่อยู่ใน:

```txt
docs/external/
```

จุดที่ทำได้ทันทีในโค้ดทำให้แล้ว: local storage fallback, PromptPay validation, readiness checks, setup plan, integration UI, platform readiness, external check script และ docs หน้างานครบ

จุดที่ยังต้องใช้บัญชีจริง: Google/Apple/Payment Gateway/Slip Verification/Storage Cloud/LINE/SMS/Email credentials

## Deploy Production แบบ VPS + Docker

เพิ่มแพ็ก deploy production แล้ว เหมาะกับ Ubuntu VPS + Docker Compose + Caddy + PostgreSQL + Redis

ไฟล์สำคัญ:

```txt
docker-compose.prod.yml
infra/docker/Dockerfile.api
infra/docker/Dockerfile.admin
infra/docker/Dockerfile.customer
infra/caddy/Caddyfile
.env.production.template
infra/scripts/deploy.sh
infra/scripts/backup.sh
infra/scripts/restore.sh
infra/systemd/koga-mdm.service
docs/deploy/DEPLOY_VPS_DOCKER_TH.md
```

รันตรวจแพ็ก deploy:

```bash
pnpm deploy:check
```

ขึ้น production:

```bash
cp .env.production.template .env
# แก้ APP_DOMAIN / CUSTOMER_DOMAIN / API_DOMAIN / secrets / database password ให้ครบ
bash infra/scripts/deploy.sh
```

อ่านคู่มือเต็ม: `docs/deploy/DEPLOY_VPS_DOCKER_TH.md`
