# Production Checklist

ระบบนี้เป็น MVP ที่ทำงานได้ แต่ก่อนใช้เงินจริงกับลูกค้าจริงต้องทำรายการนี้ให้ครบ ไม่งั้นจะได้ fintech สายมวยวัด ซึ่งฟังดูเท่แค่ก่อนโดนเรียกเอกสาร

## Security

- เปลี่ยน `JWT_SECRET` เป็นค่าสุ่มยาวอย่างน้อย 32 bytes
- เปลี่ยนรหัส admin demo หรือปิด demo account
- เปิด HTTPS ทุก domain
- จำกัด CORS เฉพาะ domain ของตัวเอง
- สำรองฐานข้อมูลทุกวัน
- เปิด audit log retention อย่างน้อย 1-3 ปี
- เพิ่ม 2FA สำหรับ OWNER/ADMIN
- ห้ามเก็บเลขบัตรประชาชนตรง ๆ ให้เก็บแบบ hash หรือเก็บในระบบ KYC ที่เหมาะสม

## Legal / Consent

- ให้ทนายตรวจสัญญาผ่อน/เช่าซื้อ
- Consent ต้องแยกเป็น 4 ส่วน: สัญญาผ่อน, แจ้งเตือนชำระ, การประมวลผลข้อมูล, การจัดการอุปกรณ์
- ระบุชัดว่า device-control ใช้ทำอะไร ไม่ใช้ทำอะไร
- เมื่อจ่ายครบต้องปลดเครื่องและออกหลักฐานปิดสัญญา
- ห้ามใช้ระบบเพื่อประจาน ข่มขู่ หรือรบกวนบุคคลอื่น

## Operations

- ตั้ง cron เรียก `POST /jobs/overdue-check` วันละ 1-2 ครั้ง
- Export รายงานทุกสิ้นวันหรือสิ้นเดือน
- ตรวจ slip/payment ก่อน confirm
- ให้สิทธิ์ collection staff เท่าที่จำเป็น
- ทุกคำสั่ง device action ต้องผ่าน approval

## Device Control

- Production ต้องใช้ `DEVICE_CONTROL_PROVIDER=android|apple|dual`
- ห้ามโฆษณาฟีเจอร์ MDM จริงจนกว่าจะ enroll เครื่องจริงและผ่าน test plan
- ถ้าจะทำ Android device financing ให้ใช้ provider/OEM/platform ที่ได้รับอนุญาต
- iPhone ควรใช้เป็นระบบสัญญา/แจ้งเตือน ไม่ควรขายฟีเจอร์ล็อกเครื่องผู้บริโภคทั่วไป
