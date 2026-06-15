# Test Plan เครื่องจริง Android + iOS

## Android

1. Publish `lease-basic` policy
2. Create Android enrollment token
3. Factory reset เครื่อง Android
4. สแกน QR enroll
5. ตรวจว่าเครื่องขึ้นใน Android Management API
6. bind `enterprises/.../devices/...` ในระบบ
7. สั่ง reminder
8. สั่ง limited mode หลัง approval
9. ชำระครบและ request release
10. ตรวจว่า release สำเร็จและ audit log ครบ

## iOS / iPadOS

1. Assign device ใน Apple Business ไปยัง MDM server
2. เปิดเครื่องแล้วให้ ADE enroll
3. ตรวจว่า `/mdm/apple/checkin` ได้ UDID/deviceToken/PushMagic
4. bind device ถ้าจับคู่จาก serial ไม่ได้
5. สั่ง DeviceInformation ผ่าน command queue
6. สั่ง DeviceLock เฉพาะเคสทดสอบที่มี consent
7. ชำระครบและ request release
8. ตรวจว่า profile/restriction ถูกถอดตาม flow

## ห้ามข้าม

- ห้ามทดสอบกับเครื่องลูกค้าจริงเป็นเครื่องแรก
- ห้ามใช้ wipe เป็นเครื่องมือทวงหนี้
- ห้าม deploy Apple โดยไม่เตือนต่ออายุ APNs certificate
