# Final Production Handover - KOGA Lease MDM SaaS

เวอร์ชันนี้รวมระบบที่คุยไว้ทั้งหมดให้เป็นแพ็กเดียวสำหรับเอาไปเปิด pilot/production ได้จริงที่สุดในขอบเขตที่ทำในโค้ดได้ โดยแยกชัดเจนระหว่าง **ระบบที่พร้อมใช้งานในเว็บเรา** กับ **ระบบนอกที่ต้องสมัคร/ใส่ credential/ทดสอบเครื่องจริง**

## ระบบที่ปิดครบในโปรเจกต์นี้

### Platform Owner
- Dashboard เจ้าของแพลตฟอร์ม
- จัดการร้าน/tenant
- Billing ร้าน, invoice, subscription status
- Settlement และ ledger รวม
- Store health score
- Platform MDM summary
- Platform MDM device/command center
- Integration readiness รวมทุกร้าน
- Apple/iCloud custody risk รวม

### Store Console
- ร้านสมัครเอง
- Onboarding ร้าน
- จัดการลูกค้า
- จัดการ customer portal user/PIN
- จัดการเครื่องและสต็อก
- สร้างสัญญา lease-to-own
- สร้างตารางงวด
- Payment request + QR PromptPay
- ตรวจสลิป manual/เตรียม webhook
- Store ledger
- Collection workspace
- Risk score
- Dispute center
- Template center
- Automation rules
- Consent snapshots
- iCloud Custody Mode
- MDM setup/integration hub

### Customer Portal
- ลูกค้า login ด้วย storeSlug + phone + PIN
- ดูสัญญา/งวด
- ดู QR ชำระงวด
- ส่งสลิป
- ดูสถานะการชำระ

## สิ่งที่ต้องต่อจากระบบนอก

### Android
ต้องสมัคร Google Cloud, เปิด Android Management API, สร้าง Android Enterprise, service account และทดสอบ enroll เครื่องจริง

### Apple / iOS
ต้องใช้ Apple Business Manager, APNs MDM certificate, ADE server token, HTTPS domain และเครื่องที่เข้า Apple Business/ADE ได้

### Payment
เริ่มด้วย manual PromptPay ได้ แต่ production ควรต่อ payment gateway หรือ slip verification provider

### Storage
ต้องต่อ Cloudflare R2, S3, Supabase Storage หรือ storage ส่วนตัว เพื่อเก็บสลิป เอกสาร รูปเครื่อง และหลักฐาน iCloud/MDM

### Notification
LINE Messaging API / SMS / Email provider ต้องสมัครและใส่ key เอง

## คำสั่งตรวจ

```bash
pnpm check:env
pnpm check:mdm
pnpm tenant:check
pnpm go-live:check
pnpm final:check
```

## ข้อห้ามสำคัญ

- ห้ามเก็บรหัส iCloud, 2FA, recovery key
- ห้ามทำ bypass Activation Lock
- ห้ามใช้ MDM แอบคุมเครื่องที่ไม่ได้ยินยอม/enroll ถูกต้อง
- ห้าม lock/wipe อัตโนมัติจากค่างวดโดยไม่มี approval และเงื่อนไขในสัญญา
- ต้องปลด MDM/iCloud custody เมื่อจ่ายครบตาม workflow

