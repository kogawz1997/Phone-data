# UI/UX Notes

## สิ่งที่ปรับแล้ว

### Admin Console

- เปลี่ยนเป็น dashboard โทน glass/dark enterprise
- เพิ่ม hero พร้อม quick actions
- เพิ่ม queue งานวันนี้
- เพิ่ม tabs แยกตามงานจริงของร้าน
- เพิ่ม overview metric cards
- เพิ่ม progress การจ่ายของสัญญา
- เพิ่ม search ในหน้าลูกค้า/เครื่อง/สัญญา
- เพิ่ม collection workspace พร้อม contact log
- เพิ่ม readiness page สำหรับบอกงานที่ต้องต่อจริง
- ปรับตารางให้ scroll ได้บนจอเล็ก
- เพิ่ม status badge หลายสี

### Customer Portal

- เปลี่ยนหน้า lookup ให้ดูเป็น portal จริง
- เพิ่ม summary card ของสัญญา
- เพิ่ม progress การผ่อน
- เพิ่ม next due card
- เพิ่มตารางงวดสวยขึ้น
- เพิ่มปุ่มแจ้งชำระรายงวด
- เพิ่มคำอธิบายให้ลูกค้าเข้าใจว่า payment ยังรอตรวจ

## สิ่งที่ควรทำต่อ

- เพิ่ม logo จริงของร้าน
- เพิ่ม light mode ถ้าลูกค้าใช้กลางแจ้งเยอะ
- ทำ mobile bottom nav สำหรับแอดมิน
- เพิ่ม contract detail drawer แทนการดูจาก table อย่างเดียว
- เพิ่ม upload component สำหรับสลิป
- เพิ่ม toast notification แทน alert/window.prompt
- เพิ่ม modal confirm ที่สวยกว่า browser confirm
- เพิ่ม empty state พร้อมคำแนะนำ
- เพิ่ม loading skeleton
- เพิ่ม chart รายรับรายเดือน

## UX ที่ควรยึด

1. งานเงินต้องมี confirmation ชัดเจน
2. คำสั่ง device action ต้องไม่อยู่ใกล้ปุ่มทั่วไปเกินไป
3. ลูกค้าต้องรู้เสมอว่ายอดไหน “รอตรวจ” และยอดไหน “ยืนยันแล้ว”
4. สถานะค้างชำระต้องใช้ภาษาสุภาพและไม่ข่มขู่
5. เมื่อจ่ายครบ ต้องมีข้อความชัดว่ากำลังดำเนินการปลดการจัดการอุปกรณ์
6. ทุกขั้นที่มีผลกับลูกค้าควรมี audit log
