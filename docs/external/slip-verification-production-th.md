# Slip Verification Production Guide

โหมดที่รองรับ:

```env
SLIP_VERIFICATION_PROVIDER="manual" # manual|webhook|bank_api
SLIP_VERIFICATION_WEBHOOK_URL=""
SLIP_VERIFICATION_WEBHOOK_SECRET=""
SLIP_VERIFY_API_KEY=""
ENABLE_PAYMENT_AUTO_VERIFY="false"
```

## Manual

ร้านตรวจสลิปเอง เหมาะกับ pilot

## Webhook

ส่งสลิปไป provider ภายนอก แล้วรับผลกลับมา

Flow ที่ควรใช้:

```txt
ลูกค้าแนบสลิป
↓
ระบบบันทึกไฟล์
↓
ส่งไป slip webhook
↓
provider ตอบ amount/date/bank/ref
↓
ระบบตรวจยอดและป้องกันสลิปซ้ำ
↓
auto confirm หรือส่งเข้า review
```

## ต้องทดสอบก่อนเปิดจริง

- สลิปยอดตรง
- สลิปยอดไม่ตรง
- สลิปซ้ำ
- สลิปเก่า
- สลิปปลอม/รูปไม่ชัด
- ธนาคารล่ม/provider timeout

ห้ามเปิด auto confirm จนกว่าจะผ่าน test cases เหล่านี้ เพราะการไว้ใจรูปสลิปในอินเทอร์เน็ตคือการเขียนบั๊กด้วยศรัทธา
