# LINE / SMS / Email Production Guide

## LINE Messaging API

```env
NOTIFICATION_PROVIDER="line"
LINE_CHANNEL_ACCESS_TOKEN=""
LINE_CHANNEL_SECRET=""
```

ต้องทำ:

1. สร้าง LINE Official Account
2. เปิด Messaging API
3. เอา Channel access token มาใส่ env
4. ผูก LINE user id กับ customer portal user
5. ทดสอบส่งข้อความภายในก่อนเปิดจริง

## SMS

```env
SMS_PROVIDER="webhook" # disabled|webhook|thaibulksms|twilio
SMS_PROVIDER_KEY=""
SMS_WEBHOOK_URL=""
```

ใช้ SMS สำหรับ OTP, แจ้งเตือนสำคัญ หรือ fallback เมื่อลูกค้าไม่ได้ใช้ LINE

## Email

```env
SMTP_URL="smtp://user:pass@host:587"
EMAIL_FROM="noreply@example.com"
```

ใช้กับ:

- reset password
- invoice ร้าน
- receipt
- export report

## Template ที่มีในระบบ

- ก่อนครบกำหนด 3 วัน
- ครบกำหนดวันนี้
- ค้าง 3 วัน
- ยืนยันรับชำระแล้ว
- จ่ายครบและรอ release

ทุกข้อความควรให้ร้านแก้เองได้ แต่ต้องมี template กลางเพื่อไม่ให้ร้านเขียนข้อความทวงหนี้เหมือนปีศาจมีเบอร์โทร
