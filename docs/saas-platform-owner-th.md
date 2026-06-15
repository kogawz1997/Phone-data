# คู่มือ Platform Owner Dashboard

หน้านี้คือหลังบ้านของเจ้าของระบบ KOGA Lease MDM SaaS ใช้ดูแลร้านทั้งหมดที่มาเช่าใช้ระบบเรา

## เมนูหลัก

- `/platform` Dashboard เจ้าของระบบ
- `/signup` หน้าให้ร้านสมัครเอง
- `/onboarding` หน้า setup สำหรับร้าน
- `/` Store Console ของร้าน

## สิ่งที่เจ้าของระบบต้องดูทุกวัน

1. ร้านที่สมัครใหม่และยังอยู่ trial
2. ร้านที่ billing overdue หรือ suspended
3. ใบแจ้งหนี้ค่าระบบที่ยังไม่จ่าย
4. integration ที่ร้านต่อไม่ครบ เช่น Android, Apple, LINE, SMS, Storage
5. ร้านที่มีสัญญาค้างชำระเยอะผิดปกติ

## แพ็กเกจเริ่มต้น

- STARTER: 990 บาท/เดือน, เหมาะกับร้านเล็ก
- STANDARD: 1,990 บาท/เดือน, เพิ่มจำนวนเครื่องและพนักงาน
- PRO: 3,990 บาท/เดือน, เหมาะกับหลายสาขา
- ENTERPRISE: ราคา custom

แก้ราคาได้ที่ API helper `planMonthlyFee()` ใน `apps/api/src/main.ts` และแก้หน้า signup ใน `apps/admin-web/src/app/signup/page.tsx`

## Billing Flow

1. เจ้าของระบบกด `ออกบิล` ให้ร้านใน `/platform`
2. ระบบสร้าง `PlatformInvoice`
3. ร้านชำระค่าระบบผ่านช่องทางที่กำหนดนอกระบบ หรือจะต่อ payment gateway ทีหลัง
4. เจ้าของระบบกด `mark paid`
5. ระบบเปลี่ยนร้านเป็น `ACTIVE/CURRENT` และตั้ง `nextBillingAt`

## การระงับร้าน

กด `ระงับ` ใน `/platform` เพื่อเปลี่ยน:

- `Organization.status = SUSPENDED`
- `billingStatus = SUSPENDED`

ใน phase ต่อไปควรเพิ่ม middleware บล็อกการสร้างสัญญาใหม่เมื่อร้าน suspended แต่ยังให้ดูข้อมูลเดิม/ชำระค่าระบบได้
