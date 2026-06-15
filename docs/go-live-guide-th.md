# คู่มือเอา KOGA Device Finance MVP ไปใช้จริง

ไฟล์นี้สรุปสิ่งที่ต้องทำก่อนใช้กับร้านจริง เพราะระบบจริงต้องมี admin จาก `.env`, HTTPS, PostgreSQL, webhook secret และ provider credentials ครบ ไม่ใช่หวังว่า config จะช่วยตัวเองได้

## 1. สิ่งที่ใช้ได้แล้วในไฟล์นี้

- Admin Console UI ใหม่
- Customer Portal UI ใหม่
- Login จาก production bootstrap
- เพิ่มลูกค้า
- เพิ่มเครื่อง / IMEI / Serial
- สร้างสัญญาผ่อน
- สร้างงวดอัตโนมัติ
- พิมพ์สัญญา / Save as PDF ผ่าน browser
- ลูกค้าเช็กสัญญาเอง
- ลูกค้าแจ้งชำระ
- แอดมิน confirm/reject payment
- Overdue checker
- Contact log สำหรับงานติดตามงวด
- Device action approval workflow ผ่าน provider adapter จริงเมื่อ credential พร้อม
- Audit log
- Export CSV
- Production env examples
- VPS deploy example

## 2. สิ่งที่ยังต้องต่อก่อนใช้เงินจริง

### Payment

MVP ตอนนี้รับ `slipUrl` และรอแอดมินยืนยันเอง

ต้องต่อเพิ่มอย่างน้อยหนึ่งทาง:

1. โอนธนาคาร + อัปโหลดสลิปไป S3/R2
2. PromptPay QR แบบ dynamic
3. Payment gateway เช่น Omise, Stripe, 2C2P, Xendit หรือเจ้าไทยที่ร้านใช้ได้
4. Webhook เพื่อยืนยันยอดอัตโนมัติ
5. Receipt/Invoice PDF

จุดที่ควรแก้:

- `packages/payments/src/index.ts`
- `apps/api/src/main.ts` route `/payments`
- เพิ่ม route `/webhooks/payments/:provider`
- เพิ่ม storage upload สำหรับสลิป

### Notification

ระบบมี notification provider แบบ local/webhook/LINE

ต้องต่อจริง:

- LINE Messaging API
- SMS provider
- Email SMTP/SendGrid
- Template แจ้งเตือนก่อนครบกำหนด
- Template แจ้งเตือนค้างชำระ
- Template ยืนยันรับชำระ
- Template จ่ายครบและปลดเครื่อง

จุดที่ควรแก้:

- `packages/notifications/src/index.ts`
- `apps/api/src/main.ts` ใน overdue job

### Device Control

Production ต้องใช้ `DEVICE_CONTROL_PROVIDER=android|apple|dual`

ของจริงต้องใช้ provider/platform ที่ได้รับอนุญาตสำหรับ use case device financing หรือระบบของ OEM ที่มีสิทธิ์ถูกต้อง

ห้ามทำ:

- ซ่อนแอป
- แอบล็อกเครื่องด้วย Accessibility/VPN/Device Admin หลอก ๆ
- ดักข้อมูลส่วนตัว
- เปิดกล้อง/ไมค์/อ่านแชต
- ใช้กับ iPhone consumer แบบอ้างว่าเป็น MDM แล้วล็อกงวด

จุดที่เตรียมไว้:

- `packages/device-control/src/types.ts`
- `packages/device-control/src/mock-adapter.ts`
- `packages/device-control/src/safe-policy.ts`
- `apps/api/src/main.ts` route `/device-actions`

## 3. ขั้นตอนตั้งค่า production

### 3.1 Database

แนะนำใช้ PostgreSQL จริง ไม่ใช่ SQLite

1. สร้าง PostgreSQL database
2. ใช้ `packages/db/prisma/schema.postgres.prisma` เป็น schema production reference
3. ตั้ง `DATABASE_URL` ใน `.env.production`
4. รัน migration/deploy schema

### 3.2 Secrets

ต้องเปลี่ยน:

```env
JWT_SECRET="สุ่มยาวมากอย่างน้อย 64 ตัว"
ADMIN_EMAIL="อีเมลเจ้าของร้าน"
ADMIN_PASSWORD="รหัสใหม่ยาวอย่างน้อย 12 ตัว"
CRON_SECRET="สุ่มยาวมาก"
```

อย่าใช้ค่า placeholder บน server จริง นั่นไม่ใช่ความมั่นใจ นั่นคือคำเชิญ

### 3.3 Domain

แนะนำแยก domain/subdomain:

```txt
admin.yourdomain.com     -> Admin Web
portal.yourdomain.com    -> Customer Web
api.yourdomain.com       -> API
```

ตั้งค่า:

- HTTPS
- CORS เฉพาะ domain ตัวเอง
- reverse proxy ด้วย Caddy/Nginx
- firewall เปิดเฉพาะ port ที่จำเป็น

### 3.4 Cron

ตั้ง cron เรียก:

```bash
curl -X POST https://api.yourdomain.com/jobs/overdue-check/cron \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

แนะนำวันละ 1-2 ครั้ง เช่น 09:00 และ 18:00

## 4. Workflow ร้านจริง

### รับเครื่องเข้าสต็อก

1. เพิ่ม Brand/Model
2. เพิ่ม IMEI
3. เพิ่ม Serial
4. ถ่ายรูปเครื่องและกล่อง เก็บไว้ใน storage ภายหลัง
5. ตั้งสถานะเป็น `IN_STOCK`

### ปล่อยผ่อน

1. เพิ่มลูกค้า
2. ตรวจเอกสารตามนโยบายร้าน
3. เพิ่มสัญญา
4. ตรวจยอดราคา/เงินดาวน์/จำนวนงวด
5. ให้ลูกค้าอ่านและยินยอม consent
6. กด Sign
7. พิมพ์สัญญา PDF
8. ส่งมอบเครื่อง

### รับชำระ

1. ลูกค้าแจ้งชำระผ่าน portal หรือพนักงานเพิ่มเอง
2. แอดมินตรวจยอดกับบัญชีจริง
3. Confirm หรือ Reject
4. ระบบอัปเดตงวด
5. ถ้าจ่ายครบ ระบบสร้าง `REQUEST_RELEASE`

### ติดตามค้างชำระ

1. รัน overdue checker
2. เปิดหน้า `ติดตามงวด`
3. โทร/LINE ลูกค้า
4. บันทึก contact log ทุกครั้ง
5. ถ้าต้องทำ device action ให้สร้างคำสั่งและรออนุมัติ

## 5. สิ่งที่ควรเพิ่มในรอบถัดไป

- Upload รูปบัตร/สลิป/เครื่อง ไป S3/R2
- Role permission แยก Owner/Admin/Staff/Collection
- 2FA
- ใบเสร็จ PDF
- สัญญา PDF แบบ server-side
- LINE login สำหรับลูกค้า
- Payment webhook
- Slip OCR/Slip verification
- Dashboard รายวัน/รายเดือน
- Branch management
- Staff activity report
- PDPA export/delete request
- Backup script

## 6. คำเตือนสำคัญ

ระบบนี้เป็น MVP ที่วาง workflow ถูกทิศ แต่ก่อนใช้จริงกับลูกค้า ควรให้ผู้เชี่ยวชาญตรวจ:

- สัญญาเช่าซื้อ/ผ่อนชำระ
- ประกาศความเป็นส่วนตัว/PDPA
- เงื่อนไขการติดตามหนี้
- เงื่อนไขการจัดการอุปกรณ์
- ขั้นตอนปลดอุปกรณ์เมื่อจ่ายครบ

อย่าปล่อยให้ระบบที่จัดการเงินและเครื่องลูกค้าถูกควบคุมด้วยความรู้สึกและปุ่มสีสวย ๆ เด็ดขาด
