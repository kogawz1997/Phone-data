# Integration TODO: ส่วนที่ต้องเชื่อมต่อของจริง

เอกสารนี้บอกชัดว่าอะไรทำไว้แล้ว อะไรยังต้องไปสมัคร/ตั้งค่าข้างนอก เพราะบางอย่าง AI ทำไฟล์ให้ได้ แต่ไปเปิดบัญชีธนาคารและขอสิทธิ์ provider แทนไม่ได้ น่าเสียดายจริง ๆ

## Payment Provider

### เป้าหมาย

ให้ระบบรู้ว่าเงินเข้าจริงโดยไม่ต้องให้แอดมินกด confirm เองทุกครั้ง

### ตัวเลือก

- Bank transfer + manual verify
- PromptPay QR
- Omise
- Stripe
- 2C2P
- Xendit
- ธนาคาร/ผู้ให้บริการไทยที่มี API

### ไฟล์ที่ต้องแก้

```txt
packages/payments/src/index.ts
apps/api/src/main.ts
apps/admin-web/src/app/page.tsx
apps/customer-web/src/app/page.tsx
```

### Route ที่ควรเพิ่ม

```txt
POST /payment-intents
POST /webhooks/payments/:provider
GET  /payments/:id/receipt
```

### Data ที่ควรเก็บเพิ่ม

```txt
payment.provider
payment.providerRef
payment.rawWebhookJson
payment.confirmedBySystem
payment.receiptNo
payment.receiptUrl
```

## Storage Upload

### เป้าหมาย

อัปโหลดสลิป รูปเครื่อง รูปกล่อง และเอกสารลูกค้าไป object storage

### แนะนำ

- Cloudflare R2
- AWS S3
- Supabase Storage
- MinIO สำหรับ self-host

### Route ที่ควรเพิ่ม

```txt
POST /uploads/presign
POST /uploads/complete
```

### ห้ามทำ

- ห้ามเก็บไฟล์ sensitive ไว้ใน public bucket
- ห้ามใช้ URL เปิดสาธารณะตลอดชีวิต
- ห้ามเก็บบัตรประชาชนโดยไม่มีเหตุผลและมาตรการป้องกัน

## Notification

### เป้าหมาย

แจ้งเตือนงวดครบกำหนด ค้างชำระ ยืนยันยอด และจ่ายครบ

### ช่องทาง

- LINE Messaging API
- SMS
- Email

### ไฟล์ที่ต้องแก้

```txt
packages/notifications/src/index.ts
apps/api/src/main.ts
```

### Template ที่ควรมี

```txt
PAYMENT_DUE_SOON
PAYMENT_OVERDUE_1
PAYMENT_OVERDUE_2
PAYMENT_CONFIRMED
PAYMENT_REJECTED
CONTRACT_PAID_OFF
DEVICE_RELEASE_PENDING
```

## Device Control Provider

### เป้าหมาย

เชื่อม provider ที่อนุญาต use case device financing จริง

### Interface ที่เตรียมไว้

```ts
export interface DeviceControlAdapter {
  enrollDevice(...): Promise<DeviceControlResult>;
  sendReminder(...): Promise<DeviceControlResult>;
  requestRestriction(...): Promise<DeviceControlResult>;
  releaseDevice(...): Promise<DeviceControlResult>;
}
```

### ไฟล์ที่ต้องแก้

```txt
packages/device-control/src/types.ts
packages/device-control/src/mock-adapter.ts
packages/device-control/src/index.ts
apps/api/src/main.ts
```

### ขั้นตอนปลอดภัย

1. เริ่มจาก dry-run
2. ส่ง reminder ก่อน restriction
3. ทุก restriction ต้องมี approval
4. เก็บ audit log
5. เมื่อชำระครบต้อง release
6. ทดสอบกับเครื่อง test เท่านั้นก่อนใช้จริง

### ห้ามทำ

- ห้ามทำ bypass MDM
- ห้ามทำ stealth lock
- ห้ามแอบ track location
- ห้ามดึงข้อมูลส่วนตัว
- ห้ามใช้สิทธิ์ Accessibility เพื่อควบคุมเครื่องผิดวัตถุประสงค์

## Legal/PDPA

### ต้องเตรียม

- Privacy Notice
- Consent record
- Data retention policy
- Contract terms
- Debt collection workflow
- Staff permission policy

### จุดที่ MVP มีแล้ว

- Consent table
- Audit log
- Contact log
- Device action approval

### จุดที่ควรเพิ่ม

- Data export request
- Data deletion/anonymization
- Role-based permission แบบละเอียด
- เอกสาร consent versioning ที่แสดงใน portal
