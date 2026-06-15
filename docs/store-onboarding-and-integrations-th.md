# คู่มือ Store Onboarding + Integration Filter

หน้านี้ออกแบบให้ร้านที่มาเช่าใช้ระบบทำงานง่ายขึ้น ไม่ต้องเข้าใจโครงสร้างระบบลึก ๆ

เปิดที่ `/onboarding`

## Checklist ร้าน

- ตั้งค่าข้อมูลร้าน
- เพิ่มสต็อกเครื่อง
- สร้างสัญญาเช่าใช้
- ตั้งค่ารับเงิน
- ตั้งค่าแจ้งเตือน
- เชื่อม Android/iOS MDM
- ตรวจสัญญาและ PDPA

## Integration Categories

### MDM

- Android Management API
- Apple Business Manager / ADE

### Payment

- PromptPay/manual
- Payment gateway webhook

### Notification

- LINE Messaging API
- SMS Gateway

### Storage

- S3/R2 สำหรับเก็บสลิป เอกสาร และรูปเครื่อง

### Automation

- Webhook ภายนอก เช่น n8n, Make, internal workflow

## สถานะที่ใช้

- `SETUP_REQUIRED`: ยังไม่ต่อ
- `CONNECTING`: กำลังสมัคร/รอ key
- `ACTIVE`: ใช้งานได้
- `DEGRADED`: ใช้ได้บางส่วน
- `FAILED`: มีปัญหา
- `DISABLED`: ปิดไว้

## จุดที่ต้องต่อของจริง

ค่า env อยู่ใน `.env.production.example` และ docs/providers/*

ถ้าเป็น Android/iOS อย่าข้ามขั้นตอนทดสอบเครื่องจริง เพราะ MDM ที่ไม่เคย enroll เครื่องจริงคือจินตนาการราคาแพง
