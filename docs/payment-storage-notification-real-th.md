# Payment / Storage / Notification ใช้งานจริง

## Payment webhook

Endpoint พร้อมใช้:

```txt
POST /payments/webhook
Header: x-koga-webhook-secret: <PAYMENT_WEBHOOK_SECRET>
Body: { paymentId, providerRef, status, amount, paidAt }
```

ระบบจะ confirm payment, update installment และ recalculate contract status ให้

## Upload สลิป/เอกสาร

Endpoint local พร้อมใช้:

```txt
POST /uploads/base64
Authorization: Bearer <token>
Body: { filename, contentBase64, folder, targetType, targetId }
```

Production ควรต่อ private S3/R2/Supabase Storage แทน public bucket เพราะสลิปกับบัตรประชาชนไม่ใช่ภาพแมวในอินเทอร์เน็ต

## Notification

`NOTIFICATION_PROVIDER` รองรับ:

- `local`: บันทึกผลในระบบ เหมาะ dev
- `webhook`: ยิงไป worker ภายนอก
- `line`: ใช้ LINE Messaging API push

ก่อน go-live ต้องทดสอบแจ้งเตือนครบ:

- ก่อนครบกำหนด
- เลยกำหนด
- ชำระสำเร็จ
- release device
