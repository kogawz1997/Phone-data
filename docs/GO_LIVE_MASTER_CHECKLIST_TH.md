# Go-live Master Checklist

## 1. ก่อนเปิดให้ร้านใช้

- [ ] ตั้ง `DATABASE_URL` เป็น PostgreSQL production
- [ ] ตั้ง `JWT_SECRET` ยาวและสุ่มจริง
- [ ] ตั้ง `ADMIN_EMAIL` / `ADMIN_PASSWORD` สำหรับ Platform Owner
- [ ] ตั้ง `PUBLIC_API_URL`, `ADMIN_WEB_URL`, `CUSTOMER_WEB_URL`
- [ ] ตั้ง `ALLOWED_ORIGINS`
- [ ] รัน `pnpm bootstrap:prod`
- [ ] รัน `pnpm final:check`
- [ ] ตั้ง backup database รายวัน
- [ ] ตั้ง log retention
- [ ] ตั้ง HTTPS domain

## 2. เปิดร้านแรก

- [ ] สร้างร้านผ่าน `/signup` หรือ Platform Owner
- [ ] ตั้งข้อมูลร้านและ PromptPay
- [ ] เปิด customer portal user ให้ลูกค้า test
- [ ] เพิ่มเครื่อง test
- [ ] สร้างสัญญา test
- [ ] สร้าง payment request
- [ ] ลูกค้า login portal และส่งสลิป
- [ ] ร้าน confirm payment แล้ว ledger ต้องเกิด

## 3. Payment

- [ ] เริ่ม manual PromptPay ได้
- [ ] ถ้าจะ auto ให้ต่อ provider ที่ `/payment-requests` และ `/payments/webhook`
- [ ] ตั้ง webhook secret
- [ ] เปิด slip duplicate check
- [ ] เช็กยอดตรงงวด

## 4. Storage

- [ ] ตั้ง storage provider จริง
- [ ] สลิปต้องเป็น private object
- [ ] สัญญา/PDPA/หลักฐาน iCloud ต้องเป็น private object
- [ ] ใช้ signed URL สำหรับเปิดไฟล์

## 5. MDM Android

- [ ] Google Cloud Project
- [ ] Enable Android Management API
- [ ] Service account JSON
- [ ] Enterprise signup
- [ ] ตั้ง enterprise name
- [ ] สร้าง enrollment token
- [ ] enroll Android test
- [ ] bind providerDeviceName กับ device ในระบบ
- [ ] ส่ง policy/command test

## 6. MDM Apple

- [ ] Apple Business Manager verified
- [ ] MDM server ใน Apple Business
- [ ] APNs MDM certificate
- [ ] ADE server token
- [ ] HTTPS endpoint จริง
- [ ] mobileconfig signing
- [ ] iPhone/iPad test แบบ supervised/ADE
- [ ] check-in/connect ผ่าน server ได้

## 7. Legal

- [ ] ทนายตรวจสัญญา lease-to-own
- [ ] ทนายตรวจ MDM consent
- [ ] ทนายตรวจ iCloud custody consent
- [ ] ทนายตรวจ Privacy Notice / PDPA
- [ ] ทำ terms สำหรับร้านที่ใช้แพลตฟอร์ม
- [ ] ทำขั้นตอน dispute/refund/release

