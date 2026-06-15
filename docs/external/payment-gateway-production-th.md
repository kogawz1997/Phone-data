# Payment Gateway Production Guide

ระบบตอนนี้รองรับ 2 โหมด:

## 1. Manual / PromptPay QR

เหมาะกับ pilot และร้านเล็ก ใช้งานได้ทันทีเมื่อร้านตั้งค่า PromptPay

```env
PAYMENT_GATEWAY_PROVIDER="manual"
PROMPTPAY_ID="0812345678"
PAYMENT_GATEWAY_WEBHOOK_SECRET="สุ่มยาวๆ"
```

ระบบทำได้แล้ว:

- สร้าง payment request ต่อค่างวด
- สร้าง QR PromptPay EMV payload
- ลูกค้าแนบสลิป
- ร้าน confirm/reject
- อัปเดตงวดและ ledger

## 2. Gateway / Webhook

ใช้เมื่ออยากให้ระบบ confirm payment อัตโนมัติ

```env
PAYMENT_GATEWAY_PROVIDER="webhook"
PAYMENT_GATEWAY_WEBHOOK_SECRET="สุ่มยาวๆ"
```

Webhook ที่เตรียมไว้:

```txt
POST /payments/webhook
Header: x-koga-webhook-secret: <PAYMENT_GATEWAY_WEBHOOK_SECRET>
```

Payload ขั้นต่ำ:

```json
{
  "paymentId": "pay_xxx",
  "providerRef": "tx_xxx",
  "status": "paid",
  "amount": 1000,
  "paidAt": "2026-06-15T12:00:00+07:00"
}
```

## Provider ที่เตรียม env ไว้

```env
OMISE_PUBLIC_KEY=""
OMISE_SECRET_KEY=""
GBPRIMEPAY_MERCHANT_ID=""
GBPRIMEPAY_PUBLIC_KEY=""
GBPRIMEPAY_SECRET_KEY=""
TWOC2P_MERCHANT_ID=""
TWOC2P_SECRET_KEY=""
SCB_BILLER_ID=""
SCB_API_KEY=""
```

## ขั้นตอนเปิดจริง

1. สมัคร merchant กับ provider
2. เปิด webhook ใน dashboard provider
3. ตั้ง URL เป็น `https://api-domain.com/payments/webhook`
4. ตั้ง secret ใน `.env`
5. ทดสอบรายการ 1 บาท
6. เช็กว่า installment, payment request, ledger ถูกอัปเดตตรงกัน
7. เปิด `ENABLE_PAYMENT_AUTO_VERIFY=true` หลังทดสอบผ่าน
