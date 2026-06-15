# Customer Payment Portal ต่อร้าน

เวอร์ชันนี้เพิ่มระบบให้ร้านที่เช่าใช้แพลตฟอร์มสามารถเปิดบัญชีลูกค้าและส่งลิงก์ให้ลูกค้าเข้า Portal ของร้านตัวเองได้

## หลักการแยกข้อมูล

ทุกข้อมูลลูกค้า/งวด/QR/payment request ผูกกับ `organizationId` ของร้านเสมอ:

- `CustomerPortalUser.organizationId`
- `CustomerPaymentRequest.organizationId`
- `Payment.organizationId`
- `Contract.organizationId`

ลูกค้าจะ login ด้วย `storeSlug + phone + PIN` แล้ว token ที่ได้เป็น role `CUSTOMER` ซึ่งถูกห้ามเข้าถึง API ฝั่งร้าน/admin โดยตรง

## Flow ร้าน

1. ร้านไปที่ `/customer-access`
2. ตั้งค่า PromptPay/บัญชีธนาคารของร้าน
3. เลือกลูกค้าแล้วกดสร้าง Customer Portal User
4. ระบบสร้างลิงก์และ PIN ชั่วคราวให้ส่งลูกค้า
5. ร้านไปที่ `/payment-requests`
6. เลือกสัญญาและงวด แล้วสร้าง QR ชำระ
7. ลูกค้าเปิด Portal แล้วแนบสลิป
8. ร้านตรวจสอบ แล้วกด Confirm/Reject

## Flow ลูกค้า

1. เข้าลิงก์จากร้าน เช่น `https://portal.example.com?store=abc-shop&invite=...`
2. กรอกเบอร์และ PIN
3. ดูสัญญา/งวด/วันครบกำหนด
4. เปิด QR PromptPay ของงวด
5. โอนเงินแล้วแนบลิงก์สลิป
6. รอร้านตรวจสอบ

## Endpoint สำคัญ

### ร้าน

```txt
GET  /customer-users
POST /customers/:id/portal-user
PATCH /customer-users/:id
POST /customer-users/:id/reset-pin

GET  /store/payment-settings
PUT  /store/payment-settings

GET  /payment-requests
POST /installments/:id/payment-request
POST /payment-requests/:id/confirm
POST /payment-requests/:id/reject
```

### ลูกค้า

```txt
POST /portal/auth/login
GET  /portal/me
GET  /portal/contracts
GET  /portal/payment-requests
GET  /portal/payment-requests/:id
POST /portal/payment-requests/:id/submit-slip
```

## การต่อระบบนอก

### PromptPay QR

ตอนนี้ระบบสร้าง EMV payload และ QR image data URL ได้จาก `StorePaymentSetting.promptPayId` ถ้าร้านยังไม่ตั้ง PromptPay ระบบจะยังสร้าง payment request ได้ แต่ QR จะว่างและแสดงคำเตือน

### Payment Gateway จริง

เพิ่ม adapter ได้ที่:

```txt
packages/payments/src/index.ts
apps/api/src/main.ts /payments/webhook
```

แนวทาง:

1. สร้าง `providerRef` จาก payment gateway
2. ให้ gateway ส่ง webhook กลับ `/payments/webhook`
3. ตรวจ `PAYMENT_WEBHOOK_SECRET`
4. confirm payment แล้ว update installment

### Slip verification

ทำต่อได้ที่ flow `submit-slip`:

1. ลูกค้า upload slip ไป storage ก่อน
2. ส่ง `slipUrl` เข้า payment request
3. worker ตรวจสลิปผ่าน provider
4. ถ้าผ่านให้เรียก `/payment-requests/:id/confirm`

## สิ่งที่ห้ามทำ

- ห้ามให้ customer token เข้าถึง `/customers`, `/contracts`, `/payments` ฝั่งร้าน
- ห้าม lookup contract ด้วยเบอร์แบบเก่าใน production
- ห้ามใช้ PromptPay ของแพลตฟอร์มกลางแทนร้าน ถ้าเงินจริงต้องเข้าร้านโดยตรง
- ห้ามใช้ร้านเดียวแชร์ PromptPay/บัญชีธนาคารกับร้านอื่นโดยไม่แจ้งชัด
