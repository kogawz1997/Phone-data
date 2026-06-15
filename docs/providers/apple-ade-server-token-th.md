# Apple ADE Server Token

ADE หรือ Automated Device Enrollment ใช้ให้เครื่ององค์กร enroll เข้า MDM ตั้งแต่แกะกล่อง

## วิธีตั้งค่าโดยรวม

1. ใน Apple Business Manager ไปที่ Device Management Settings
2. Add MDM Server
3. Upload public key/certificate ของ MDM server
4. Download server token `.p7m`
5. เอา token ไปเก็บบน server
6. ตั้งค่า env

```env
APPLE_ABM_SERVER_TOKEN_PATH="/opt/koga/certs/apple-abm-server-token.p7m"
```

## จุดที่ระบบเราเตรียมไว้

```txt
POST /mdm/apple/abm/sync
packages/device-control/src/adapters/apple-mdm.adapter.ts
```

## ต้องเขียนต่อจริง

```txt
- อ่าน token .p7m
- sync device list จาก ABM
- assign profile ให้ serial number
- map serial/UDID กับ device ใน database
- release device เมื่อจ่ายครบและโอนกรรมสิทธิ์
```
