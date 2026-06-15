# เริ่มใช้งาน Final Production Pack

```bash
cd phone-finance-mdm-saas-final-production
pnpm create:env
pnpm install
pnpm db:generate
pnpm db:push
pnpm bootstrap:prod
pnpm final:check
pnpm dev
```

เปิดเว็บ:

```txt
Store Console:     http://localhost:3000
Customer Portal:   http://localhost:3002
API:               http://localhost:4000
Platform Owner:    http://localhost:3000/platform
Final Systems:     http://localhost:3000/all-systems
```

จุดที่ต้องตั้งค่าก่อน production จริง:

1. PostgreSQL production
2. Storage จริงสำหรับไฟล์
3. Payment gateway/slip verification หรือ manual process
4. LINE/SMS/Email provider
5. Android Management API ถ้าจะใช้ MDM Android จริง
6. Apple Business/APNs/ADE ถ้าจะใช้ iOS MDM จริง
7. ให้ทนายตรวจสัญญา/PDPA/MDM/iCloud consent

---

# เริ่มใช้งาน KOGA Lease MDM SaaS Platform

เวอร์ชันนี้เปลี่ยนจากระบบร้านเดียวเป็น **เว็บ SaaS หลายร้าน**

- เจ้าของระบบเข้า `/platform`
- ร้านสมัครเองที่ `/signup`
- ร้านจัดการงานตัวเองที่ `/`
- ร้านตั้งค่างานจริงและ integration ที่ `/onboarding`

## 1) สร้างไฟล์ env

```bash
pnpm create:env
```

หรือ copy เอง:

```bash
cp .env.example .env
```

## 2) ติดตั้งและสร้าง DB

```bash
pnpm install
pnpm db:generate
pnpm db:push
pnpm bootstrap:prod
```

`bootstrap:prod` จะสร้างบัญชี **Platform Owner** จากค่าใน `.env`

```env
ADMIN_EMAIL="..."
ADMIN_PASSWORD="..."
```

## 3) รันระบบ

```bash
pnpm dev
```

เปิด:

```txt
Admin/Store Console: http://localhost:3000
Platform Owner:      http://localhost:3000/platform
Store Signup:        http://localhost:3000/signup
Store Onboarding:    http://localhost:3000/onboarding
Customer Portal:     http://localhost:3002
API:                 http://localhost:4000
```

## 4) สร้างร้านใหม่

เข้า `/signup` แล้วกรอกข้อมูลร้าน ระบบจะสร้าง tenant แยกให้ร้านทันที

หลังร้านสมัครแล้ว ให้ร้าน login ที่ `/` ด้วยอีเมล/รหัสผ่านที่ตั้งไว้

## 5) Owner ดูแลร้าน

เข้า `/platform` ด้วยบัญชี Platform Owner เพื่อดู:

- ร้านทั้งหมด
- MRR ประมาณการ
- รายได้ค่าระบบจาก invoice ที่ paid
- สถานะร้าน trial/active/suspended
- ใบแจ้งหนี้ค่าระบบ
- integration readiness ของร้าน

## 6) ร้านตั้งค่างานจริง

ร้านเข้า `/onboarding` เพื่อทำ checklist:

- ตั้งค่าร้าน
- เพิ่มเครื่อง
- สร้างสัญญา
- ตั้ง payment
- ตั้ง LINE/SMS
- เชื่อม Android/iOS MDM
- ตรวจ legal/PDPA


## 6.5) ร้านเปิด Customer Portal ให้ลูกค้า

1. เข้า `http://localhost:3000/customer-access`
2. ตั้ง PromptPay/บัญชีธนาคารของร้าน
3. เลือกลูกค้าแล้วสร้าง Customer Portal User
4. ส่งลิงก์ + PIN ให้ลูกค้า
5. เข้า `http://localhost:3000/payment-requests` เพื่อสร้าง QR งวด
6. ลูกค้าเข้า `http://localhost:3002` ด้วยรหัสร้าน + เบอร์ + PIN
7. ลูกค้าดูงวด/QR/แนบสลิป ร้านกด Confirm จากหน้า payment requests

ข้อมูลลูกค้าและ QR ผูกกับ `organizationId` ของร้าน จึงไม่ปนกับร้านอื่น

## 7) ถ้าต้องการข้อมูลตัวอย่าง

```bash
SEED_SAMPLE_DATA=true pnpm db:seed:sample
```

## 8) ต่อระบบภายนอก

ดูเอกสารใน:

```txt
docs/providers/android-management-api-setup-th.md
docs/providers/apple-business-manager-setup-th.md
docs/payment-storage-notification-real-th.md
docs/store-onboarding-and-integrations-th.md
```

สิ่งที่ต้องสมัครเอง:

- Google Cloud + Android Management API
- Apple Business Manager + APNs/ADE
- Payment gateway
- LINE Messaging/SMS
- S3/R2 storage

อย่าพยายามใช้ MDM กับเครื่องที่ไม่ใช่ asset ของร้าน/บริษัทและไม่มี consent ชัดเจน เพราะนั่นไม่ใช่ SaaS แล้ว มันคือการส่งคำเชิญให้ปัญหามาเคาะประตู 🫠

## เพิ่มเติม: โหมด iCloud ร้าน

ถ้าร้านมีเครื่องที่ใช้ iCloud ร้านอยู่แล้ว ให้ไปที่:

```txt
Store Console → /apple-custody
```

ขั้นตอน:

1. เพิ่ม iPhone/iPad เข้าสต็อก
2. เลือก `controlMode = ICLOUD_CUSTODY` หรือไปเปิดที่หน้า `/apple-custody`
3. กรอก Apple ID alias ของร้าน ห้ามกรอกรหัสผ่าน
4. อัปโหลด/ใส่ URL หลักฐานการตรวจเครื่อง
5. สร้างสัญญา lease-to-own ตามปกติ
6. เมื่อลูกค้าจ่ายครบ ระบบจะขึ้นงาน `RELEASE_DUE`
7. ร้านปลด iCloud/Find My เอง แล้ว mark released พร้อมหลักฐาน

เจ้าของแพลตฟอร์มดูความเสี่ยงรวมได้ที่:

```txt
/platform/apple-custody-risk
```

## โครงสร้างรอบรีแฟกเตอร์

หลังตั้งค่า env และติดตั้ง dependency แล้ว ให้รัน:

```bash
pnpm route:inventory
pnpm arch:check
```

ไฟล์สำคัญ:

```txt
apps/api/src/core/permissions.ts
apps/api/src/core/tenant.ts
apps/api/src/core/route-groups.ts
apps/api/src/modules/*
docs/architecture/CODE_STRUCTURE_REFACTOR_TH.md
docs/architecture/API_MODULE_MAP_TH.md
```

ถ้าจะให้ทีม dev รับต่อ ให้เริ่มอ่านจาก `docs/architecture/CODE_STRUCTURE_REFACTOR_TH.md` ก่อน ไม่งั้นจะเปิด `main.ts` แล้วรู้สึกเหมือนโดนโยนเข้าป่าพร้อมเข็มทิศที่เป็นของเล่นเด็ก.

## หลังจากรอบ External-ready

ให้รันเพิ่ม:

```bash
pnpm external:check
```

เปิดหน้า:

```txt
Store Integration Hub: http://localhost:3000/integrations
Platform Integration Readiness: http://localhost:3000/platform/integrations
```

ลำดับเปิดใช้ระบบนอกที่แนะนำ:

1. ตั้ง `STORAGE_PROVIDER=local` สำหรับ pilot หรือ `r2/s3` สำหรับ production
2. ตั้ง PromptPay ร้านในหน้า Payment Settings
3. ตั้ง LINE/SMS/Email อย่างน้อย 1 ช่องทาง
4. ต่อ Payment Gateway หรือ Slip Verification เมื่อเริ่มมีร้านใช้งานจริง
5. ต่อ Android Management API หลัง flow ร้าน/ลูกค้า/payment นิ่ง
6. ต่อ Apple MDM/ADE เป็น phase ถัดไป

## Deploy ขึ้น VPS

รอบนี้เพิ่มไฟล์ deploy ให้ครบแล้ว:

```txt
docker-compose.prod.yml
infra/docker/*
infra/caddy/Caddyfile
.env.production.template
infra/scripts/deploy.sh
infra/scripts/backup.sh
infra/scripts/restore.sh
infra/systemd/koga-mdm.service
```

วิธีเร็ว:

```bash
cp .env.production.template .env
# แก้ค่าใน .env ให้ครบ โดยเฉพาะ domain, password, secret
pnpm deploy:check
bash infra/scripts/deploy.sh
```

คู่มือเต็มอยู่ที่:

```txt
docs/deploy/DEPLOY_VPS_DOCKER_TH.md
```
