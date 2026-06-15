# KOGA Production Systems Pack

เอกสารนี้คือแผนปิดงานระบบจริงสำหรับ KOGA Lease MDM SaaS หลังจากเพิ่ม UX layer, mobile layer และ production readiness workflow แล้ว

> เป้าหมาย: ทำให้ระบบพร้อมใช้กับร้านจริงแบบควบคุมความเสี่ยง ไม่ใช่แค่หน้าเว็บดูสวยแต่ข้างหลังยังเป็นกล่องกระดาษติดไฟ

## สถานะระบบหลัก

| ระบบ | สถานะในโปรเจกต์ | ก่อนใช้งานจริงต้องมี |
|---|---|---|
| Store Onboarding | มี step workflow / production shell | เชื่อม validation ราย step + progress saved ต่อร้าน |
| Contract Wizard | มี contract core + UX route | เพิ่ม wizard step-by-step + PDF preview |
| Payment Review | มี payment core + webhook/manual flow | ต่อ provider จริง + slip verification |
| Customer Portal | มี portal/auth flow | ตรวจ UX ลูกค้า + QR payment + consent flow |
| Collection CRM | มี collection route / overdue job | เพิ่ม timeline และ follow-up automation จริง |
| Store Settings | มี env/provider configs | ย้ายค่าร้านออกจาก env ให้แก้ใน UI |
| Role & Permission | มี permission backend + UI gating | เพิ่มหน้าแก้ role/permission แบบ checkbox |
| Audit Timeline | มี audit log | ทำ timeline diff ก่อน/หลังแก้ข้อมูล |
| Notification Center | มี templates / connectors | ทำ inbox แจ้งเตือนในระบบ + mark as read |
| Template Center | มี template center | เพิ่ม preview/variable helper ก่อนส่งจริง |
| Risk Engine | มี risk scoring | เพิ่ม UI อธิบายคะแนนและเหตุผล |
| Document Center | มี upload/storage foundation | ต่อ cloud storage + file preview |
| Contract PDF | มี render contract foundation | เพิ่ม signed PDF + download/archive |
| Digital Consent | มี consent/template foundation | เก็บ IP/device/timestamp/PDPA consent |
| Owner Dashboard | มี platform owner route | เพิ่ม billing metrics, trial, subscription status |
| SaaS Billing | มี plan/fee foundation | ต่อ Stripe/PromptPay billing จริง |
| Backup/Restore | ต้องเพิ่ม infra | ตั้ง Railway backup + export script |
| Import/Export | มี export บางส่วน | เพิ่ม CSV import พร้อม validation |
| Help Center | ต้องเพิ่ม content | เพิ่ม in-app guide และ SOP ร้าน |

## Production gate ก่อนขายจริง

### 1. Database

- ใช้ Postgres production เท่านั้น
- เปิด backup/snapshot
- ทดสอบ `pnpm --filter @repo/db db:push:postgres`
- bootstrap admin ต้องสร้าง platform owner ได้
- ห้ามโชว์ secret ใน screenshot หรือ log

### 2. Auth & Security

- `JWT_SECRET` ต้องยาวและสุ่มจริง
- บังคับรหัสผ่าน admin แข็งแรง
- จำกัด CORS เฉพาะ domain จริง
- เพิ่ม rate limit login แล้ว
- ต้องเปิด HTTPS/domain จริงก่อนขาย

### 3. Payments

- Manual PromptPay ใช้ pilot ได้
- Production ต้องต่อ payment provider + webhook secret
- Slip verification ต้องใช้ provider จริง
- Payment review ต้องมีคนอนุมัติและ audit log

### 4. MDM / Device Control

- Android: ใช้ Android Management API พร้อม service account จริง
- Apple: ใช้ Apple Business Manager/ADE + APNs certificate/token จริง
- ทุก action ต้องมี consent, reason, approval, audit log
- ห้ามใช้ provider mock กับลูกค้าจริง

### 5. Legal / PDPA

- สัญญาและ consent ต้องให้ทนายตรวจ
- ต้องมี privacy notice
- เก็บ consent timestamp/IP/device info
- ลูกค้าต้องเห็นเงื่อนไขก่อนส่งมอบเครื่อง

### 6. Operations

- เปิด cron overdue check ด้วย `CRON_SECRET`
- เปิด notification channel จริง เช่น LINE/SMS/email
- ตั้ง monitoring และ error alert
- สร้าง SOP สำหรับพนักงานร้าน

## ENV production baseline

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=replace-with-long-random-secret
CRON_SECRET=replace-with-long-random-cron-secret
PUBLIC_API_URL=https://your-api-domain
ADMIN_WEB_URL=https://your-admin-domain
CUSTOMER_WEB_URL=https://your-customer-domain
ALLOWED_ORIGINS=https://your-admin-domain,https://your-customer-domain
PAYMENT_PROVIDER=webhook
PAYMENT_WEBHOOK_SECRET=replace-with-payment-secret
PROMPTPAY_ID=your-promptpay-id
LINE_CHANNEL_ACCESS_TOKEN=replace-if-used
LINE_CHANNEL_SECRET=replace-if-used
ANDROID_MANAGEMENT_PROJECT_ID=replace-if-used
ANDROID_MANAGEMENT_ENTERPRISE_NAME=replace-if-used
ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON=replace-if-used
APPLE_MDM_BASE_URL=replace-if-used
APPLE_MDM_APNS_CERT_PATH=replace-if-used
APPLE_ABM_SERVER_TOKEN_PATH=replace-if-used
STORAGE_PROVIDER=s3
UPLOAD_DIR=/data/uploads
```

## Deployment order

1. Deploy API
2. API start command รัน db push + bootstrap
3. ตรวจ `/ops/readiness`
4. Deploy admin-web
5. Deploy customer-web
6. ทดสอบ login admin
7. สร้างร้าน pilot
8. เพิ่มเครื่อง test
9. สร้างลูกค้า test
10. สร้างสัญญา test
11. บันทึกงวด test
12. ตรวจ audit log
13. ทดสอบ customer portal
14. ทดสอบ notification
15. ทดสอบ provider จริงทีละตัว

## Pilot checklist

- [ ] ร้าน pilot 1 ร้าน
- [ ] ลูกค้า test 3 คน
- [ ] Android test 1 เครื่อง
- [ ] iPhone test 1 เครื่อง ถ้ามี Apple provider
- [ ] สัญญา test 3 รูปแบบ: ปกติ, ค้าง, จ่ายครบ
- [ ] ทดสอบ payment review
- [ ] ทดสอบ customer portal
- [ ] ทดสอบ collection task
- [ ] ทดสอบ export/report
- [ ] ทดสอบ audit log
- [ ] ทดสอบ backup restore

## สิ่งที่ห้ามข้าม

- ห้ามใช้ mock provider กับลูกค้าจริง
- ห้าม hardcode password/secret ใน repo
- ห้ามปล่อย admin default password
- ห้ามรับเงิน production โดยไม่มี webhook secret
- ห้ามส่งคำสั่ง device control โดยไม่มี consent และ audit
- ห้ามใช้สัญญาโดยไม่ผ่านการตรวจทางกฎหมาย

## Production definition of done

ระบบถือว่า production-ready เมื่อ:

- DB พร้อม backup
- Admin/Store/Customer login ใช้ได้
- Contract/payment/customer/device flow ใช้งานจริงครบ
- Payment provider หรือ manual payment SOP พร้อม
- MDM provider จริงพร้อม หรือปิด feature นี้ไว้ชัดเจน
- Audit log ครบทุก action สำคัญ
- Notification ส่งจริงได้
- PDF/Document เก็บและเรียกดูได้
- Owner dashboard เห็นร้านและ billing
- มี SOP ร้าน + คู่มือใช้งาน
- มี monitoring/error recovery

## สรุป

KOGA ตอนนี้มีแกน SaaS + UX production layer แล้ว แต่การขายจริงต้องผ่าน external gate: payment, notification, storage, Android/Apple provider, legal document และ operation SOP

รอบต่อไปควรเน้นปิด workflow ที่ทำเงินก่อน:

1. Contract Wizard
2. Payment Review
3. Customer Portal
4. Collection CRM
5. Store Settings
6. Contract PDF + Consent
