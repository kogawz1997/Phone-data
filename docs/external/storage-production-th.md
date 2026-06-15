# Storage Production Guide

ระบบใช้ local upload ได้ทันทีสำหรับ dev/pilot แต่ production ต้องใช้ private object storage

## โหมด local

```env
STORAGE_PROVIDER="local"
UPLOAD_DIR="./uploads"
PUBLIC_UPLOAD_BASE_URL="https://api.example.com/uploads"
MAX_UPLOAD_BYTES="8000000"
```

ใช้ได้ทันที แต่ไม่เหมาะกับ production ระยะยาวถ้ามีหลาย server

## Cloudflare R2 / S3

```env
STORAGE_PROVIDER="r2"
STORAGE_BUCKET="koga-lease-prod"
STORAGE_ENDPOINT="https://<accountid>.r2.cloudflarestorage.com"
STORAGE_ACCESS_KEY_ID=""
STORAGE_SECRET_ACCESS_KEY=""
```

## Supabase Storage

```env
STORAGE_PROVIDER="supabase"
SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""
STORAGE_BUCKET="documents"
```

## ไฟล์ที่ต้องเก็บแบบ private

- สลิป
- เอกสารลูกค้า
- รูปเครื่อง
- สัญญา PDF
- consent snapshot
- หลักฐาน iCloud custody
- หลักฐาน release/โอนกรรมสิทธิ์

## Checklist

1. bucket เป็น private
2. ใช้ signed URL สำหรับดาวน์โหลด
3. จำกัดขนาดไฟล์
4. ตรวจ MIME type
5. log คนเปิดดูไฟล์
6. backup/retention policy
