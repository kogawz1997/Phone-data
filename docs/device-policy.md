# Device Policy

ระบบนี้แยก policy เป็น 3 ชั้น:

1. `lease-basic` สำหรับเครื่องปกติ
2. `lease-limited` สำหรับเคสค้างชำระที่ผ่านการแจ้งเตือน + review + approval แล้ว
3. `lease-release` สำหรับจ่ายครบและปลดการจัดการ

Production ต้องตั้ง `DEVICE_CONTROL_PROVIDER=android|apple|dual` และผูกเครื่องกับ provider device id จริงก่อนอนุมัติคำสั่งที่กระทบเครื่อง

ห้ามใช้ policy เพื่อแอบดูข้อมูลส่วนตัว, ซ่อน MDM, bypass factory reset แบบนอกกติกา, เปิดกล้อง/ไมค์ หรือ wipe เพื่อทวงหนี้
