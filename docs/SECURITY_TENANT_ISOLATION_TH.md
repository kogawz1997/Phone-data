# Security & Tenant Isolation

ระบบนี้เป็น multi-tenant SaaS ข้อมูลต้องไม่ปนกันเด็ดขาด

## หลักการ

ทุกข้อมูลร้านต้องผูก `organizationId` เสมอ เช่น:
- customers
- devices
- contracts
- installments
- payments
- payment requests
- customer portal users
- MDM enrollments
- MDM commands
- iCloud custody records
- disputes
- collection tasks
- templates
- automation rules

## กติกา API

Store user:
- อ่าน/เขียนได้เฉพาะ `organizationId` ของตัวเอง

Platform owner:
- อ่านภาพรวมทุก tenant ได้
- จัดการ billing/MDM/provider ระดับ platform ได้

Customer portal user:
- อ่านเฉพาะ customerId ของตัวเองใน organizationId ของร้านตัวเอง

## ทดสอบ

```bash
pnpm tenant:check
```

และต้อง test manual:
1. ร้าน A สร้างลูกค้า
2. ร้าน B login แล้วต้องไม่เห็นลูกค้าร้าน A
3. ลูกค้าร้าน A ต้องไม่ login ด้วย storeSlug ร้าน B ได้
4. ร้าน A ต้องไม่ยิง API device/payment ของร้าน B สำเร็จ

