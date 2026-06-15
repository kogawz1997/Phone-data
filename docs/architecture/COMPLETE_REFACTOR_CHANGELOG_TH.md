# Complete Refactor Changelog

## เปลี่ยนหลัก

- แตก `apps/api/src/main.ts` จากไฟล์ route รวม 2,700+ บรรทัด เหลือไฟล์ bootstrap เล็ก ๆ
- สร้าง `apps/api/src/core/app-context.ts` เพื่อรวม helper, auth guard, audit, payment/MDM helper และ shared utilities
- ย้าย route runtime จริงไปไว้ใน `apps/api/src/modules/*/register-*.ts`
- เพิ่ม `apps/api/src/modules/register-modules.ts` สำหรับ register ทุก domain module
- ปรับ `scripts/api-route-inventory.mjs` ให้ scan route จาก module ทั้งหมด ไม่ใช่ main.ts อย่างเดียว
- ปรับ `scripts/architecture-check.mjs` ให้ตรวจ module extraction จริง

## จำนวน routes ที่ตรวจพบ

- 126 API routes จาก module files

## หมายเหตุ

การรีแฟกเตอร์นี้เป็น safe modular extraction: logic route เดิมยังอยู่ แต่ถูกย้ายไปตาม domain module แล้ว ขั้นต่อไปสำหรับทีม dev คือค่อยแยก service/repository ภายในแต่ละ module เพื่อให้ test ง่ายขึ้น
