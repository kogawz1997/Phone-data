# แผนทดสอบ Android Enrollment

## เครื่องที่ต้องเตรียม

- Android 8+ ขึ้นไป
- เครื่อง factory reset
- ใช้บัญชีทดสอบ ไม่ใช่เครื่องส่วนตัวหลัก
- อินเทอร์เน็ตเสถียร

## Test case

1. สร้าง policy `lease-basic`
2. สร้าง enrollment token แบบ one-time
3. แสดง QR
4. factory reset เครื่อง
5. แตะหน้าจอ setup หลายครั้งเพื่อเปิด QR enrollment ตามวิธีของ Android Enterprise
6. สแกน QR
7. ตรวจว่า Android Device Policy ถูกติดตั้ง
8. ตรวจว่าเครื่องขึ้นใน device list
9. ทดสอบ sync device information
10. ทดสอบ policy change แบบไม่กระทบข้อมูลส่วนตัว
11. ทดสอบ release/retire เมื่อจ่ายครบ

## ห้ามทดสอบกับลูกค้าจริงก่อน

ทดสอบทุก flow กับเครื่องของร้านเองก่อนอย่างน้อย 10-20 รอบ เพราะ production bug ที่เกี่ยวกับเครื่องลูกค้านี่ไม่ใช่ bug, มันคือโทรศัพท์เข้าร้านแบบไม่หยุด
