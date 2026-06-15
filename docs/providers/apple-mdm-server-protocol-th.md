# Apple MDM Server Protocol ที่ต้องต่อจริง

## Endpoints ที่เตรียมไว้แล้ว

```txt
POST /mdm/apple/checkin
PUT  /mdm/apple/connect
GET  /mdm/apple/enroll/:token.mobileconfig  # ต้องเพิ่มเมื่อทำ mobileconfig จริง
```

## Flow จริง

```txt
1. เครื่องติดตั้ง MDM profile / enroll ผ่าน ADE
2. เครื่อง check-in ส่งข้อมูล identity, token, push magic
3. server เก็บ device token และ push token
4. admin สร้าง command
5. server ส่ง APNs push
6. device เรียก /mdm/apple/connect
7. server ส่ง command plist
8. device ส่งผลลัพธ์กลับมา
```

## Commands ที่ควรเริ่ม

```txt
- DeviceInformation
- ProfileList
- SecurityInfo
- InstallProfile
- DeviceLock
- EnableLostMode เฉพาะกรณีหาย/ถูกขโมย
- RemoveProfile / Release flow เมื่อจ่ายครบ
```

## อย่าเริ่มจาก EraseDevice

`EraseDevice` เป็นคำสั่งแรงมาก ควรใช้เฉพาะเหตุด้านความปลอดภัยหรือการคืนเครื่องตามสัญญา ไม่ใช่เครื่องมือทวงงวด เพราะการเอาค้อนทุบปัญหาไม่ได้ทำให้กลายเป็นระบบองค์กร
