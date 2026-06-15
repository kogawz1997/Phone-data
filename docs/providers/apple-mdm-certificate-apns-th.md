# Apple MDM Push Certificate / APNs

Apple MDM ต้องใช้ APNs MDM Push Certificate เพื่อปลุกเครื่องให้กลับมาติดต่อ MDM server แล้วดึง command ไปทำงาน

## ต้องเตรียม

```txt
- Apple Developer/Apple Business workflow ที่รองรับ MDM certificate
- CSR สำหรับ MDM push certificate
- private key ที่เก็บปลอดภัย
- APNs topic เช่น com.apple.mgmt.External.xxxxx
- ระบบเตือนต่ออายุ certificate
```

## ค่า env

```env
APPLE_MDM_APNS_CERT_PATH="/opt/koga/certs/apple-mdm-apns.pem"
APPLE_MDM_APNS_KEY_PATH="/opt/koga/certs/apple-mdm-apns-key.pem"
APPLE_MDM_APNS_TOPIC="com.apple.mgmt.External.xxxxx"
```

## สิ่งที่ต้องเขียนต่อ

```txt
- สร้าง APNs client สำหรับ MDM certificate-based push
- เก็บ push token จาก check-in
- เมื่อมี command ให้ส่ง APNs push
- device จะมา connect ที่ /mdm/apple/connect
- server ส่ง command เป็น plist ตาม Apple MDM protocol
```

## ระวัง

ถ้า APNs certificate หมดอายุ เครื่องที่ enroll แล้วจะคุยกับ MDM server ไม่ได้ ต้องทำระบบแจ้งเตือนก่อนหมดอายุอย่างน้อย 30/14/7 วัน ไม่งั้นวันหนึ่งจะมีโทรศัพท์หลายสิบเครื่องกลายเป็นบทเรียนราคาแพง
