# Google Cloud Service Account สำหรับ Android Management API

## สร้าง Service Account

1. เข้า Google Cloud Console
2. เลือก project ที่เปิด Android Management API
3. IAM & Admin > Service Accounts
4. Create service account
5. ตั้งชื่อ เช่น `koga-mdm-api`
6. สร้าง key แบบ JSON
7. ดาวน์โหลดไฟล์ JSON
8. อัปโหลดไว้บน server ใน path ที่ไม่มี public access

ตัวอย่าง path production:

```txt
/opt/koga/certs/google-service-account.json
```

## ตั้งค่า env

```env
ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON="/opt/koga/certs/google-service-account.json"
```

## Security checklist

- ห้าม commit JSON key เข้า git
- จำกัด permission เท่าที่จำเป็น
- rotate key เมื่อคนออกจากทีม
- backup key อย่างปลอดภัย
- ใน production ใช้ secret manager จะดีกว่าเก็บไฟล์ตรง ๆ
