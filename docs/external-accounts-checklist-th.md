# Checklist บัญชีภายนอกที่ต้องสมัคร

## Android

- Google Cloud Project
- Android Management API enabled
- Service Account JSON พร้อม scope `https://www.googleapis.com/auth/androidmanagement`
- Enterprise signup URL ที่สร้างจากระบบ
- Enterprise name รูปแบบ `enterprises/...`
- เครื่อง Android factory reset สำหรับทดสอบ
- Zero-touch reseller ถ้าต้องการเปิดกล่องแล้ว enroll อัตโนมัติ

## iOS / iPadOS

- Apple Business Manager ที่ verify แล้ว
- APNs MDM Push Certificate
- MDM server ใน Apple Business
- ADE server token `.p7m`
- Profile signing certificate/key ถ้าจะ sign mobileconfig จากระบบ
- HTTPS domain จริงสำหรับ `/mdm/apple/checkin` และ `/mdm/apple/connect`
- เครื่องที่ assign เข้า Apple Business แล้ว

## Payment / Notification / Storage

- Payment gateway ที่ส่ง webhook ได้
- ตั้ง `PAYMENT_WEBHOOK_SECRET` แล้วให้ gateway ส่ง header `x-koga-webhook-secret`
- LINE Messaging API หรือ notification worker
- Private object storage สำหรับเอกสารและสลิป
- Backup database รายวัน
