# Checklist ก่อนใช้งานจริง

## Infrastructure

- ใช้ PostgreSQL production ไม่ใช้ SQLite
- ตั้ง HTTPS domain จริง
- ตั้ง CORS allowlist
- ตั้ง JWT_SECRET, CRON_SECRET, webhook secrets
- เปิด backup database รายวัน
- ตั้ง monitoring และ log retention

## Store SaaS

- กำหนดแพ็กเกจและ device limit
- เปิดระบบ invoice ร้าน
- ตั้ง workflow ระงับร้านที่ค้างค่าระบบ
- ตรวจ tenant isolation ทุก endpoint

## Customer Payment

- ตั้ง PromptPay ต่อร้าน
- เปิด upload storage จริง
- ต่อ slip verification หรือ payment gateway
- ตรวจ flow confirm/reject payment

## MDM

- Android: Google Cloud + Android Management API + Enterprise + เครื่องทดสอบ
- iOS: Apple Business Manager + APNs MDM certificate + ADE token + เครื่องทดสอบ
- iCloud Custody: ยืนยันว่าไม่เก็บรหัสผ่าน/2FA/recovery key

## Legal

- ทนายตรวจสัญญา lease-to-own
- ทนายตรวจ MDM consent
- ทนายตรวจ PDPA/privacy notice
- เพิ่ม dispute/complaint process
- ทำหลักฐาน release เมื่อจ่ายครบ
