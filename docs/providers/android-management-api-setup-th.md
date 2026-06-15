# วิธีหาและสมัคร Android Management API สำหรับระบบ Lease-to-own MDM

> ใช้กับ Android ก่อน เพราะทำ MVP จริงง่ายกว่า iOS เยอะ พูดตรง ๆ คือ Google ให้บันไดมา ส่วน Apple ให้เชือกกับคู่มือผูกเงื่อน

## 1) หาได้จากไหน

- Google for Developers: Android Management API
- Google Cloud Console: เปิด API ชื่อ `Android Management API`
- เอกสาร Quickstart ของ Google ใช้ลอง enroll enterprise, create policy และ provision device

คำค้นที่ใช้:

```txt
Android Management API Google Developers
Android Management API quickstart
Android Management API enrollment token
Android Enterprise fully managed device
```

## 2) สมัคร/เปิดใช้งาน

1. เข้า Google Cloud Console
2. สร้าง Project ใหม่ เช่น `koga-lease-mdm-prod`
3. ไปที่ APIs & Services
4. Enable API: `Android Management API`
5. ไปที่ IAM & Admin > Service Accounts
6. สร้าง Service Account เช่น `koga-mdm-api`
7. สร้าง JSON key แล้วเก็บใน server เช่น `/opt/koga/certs/google-service-account.json`
8. ตั้งค่า callback URL เช่น `https://api.your-domain.com/mdm/android/signup-callback`
9. ขอ initial device quota ถ้าระบบแจ้งว่า quota เป็น 0 หรือยัง provision ไม่ได้

## 3) ค่า .env ที่ต้องใส่

```env
DEVICE_CONTROL_PROVIDER="dual"
ANDROID_MANAGEMENT_PROJECT_ID="your-google-cloud-project-id"
ANDROID_MANAGEMENT_ENTERPRISE_NAME="enterprises/LCxxxxxxxx"
ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON="/opt/koga/certs/google-service-account.json"
ANDROID_MANAGEMENT_CALLBACK_URL="https://api.your-domain.com/mdm/android/signup-callback"
ANDROID_MANAGEMENT_WEBHOOK_SECRET="สุ่มยาว ๆ"
ANDROID_MANAGEMENT_DEFAULT_POLICY="lease-basic"
```

## 4) Flow ที่ระบบเราเตรียมไว้แล้ว

```txt
Admin > MDM Setup
↓
Create Android enrollment token
↓
ระบบเรียก adapter: packages/device-control/src/adapters/android-management.adapter.ts
↓
ของจริงต่อ endpoint enterprises.enrollmentTokens.create
↓
แสดง QR ให้สแกนตอน setup เครื่อง
↓
เครื่องเข้า fully managed/company-owned
```

## 5) จุดที่ต้องเขียนต่อจริง

ไฟล์หลัก:

```txt
packages/device-control/src/adapters/android-management.adapter.ts
```

ต้องต่อ:

```txt
- Auth ด้วย service account
- signupUrls.create
- enterprises.create
- enterprises.policies.patch
- enterprises.enrollmentTokens.create
- enterprises.devices.get/list
- enterprises.devices.issueCommand
- webhook receiver
```

## 6) ข้อควรระวัง

- ใช้กับเครื่องที่ร้าน/บริษัทถือกรรมสิทธิ์และ enroll ก่อนส่งมอบ
- อย่าใช้แนว device finance lock นอก policy ของ Google
- อย่าใช้ accessibility/device admin เถื่อนมาล็อกเครื่อง เพราะนั่นคือทางลัดไปสู่ปัญหา ไม่ใช่ฟีเจอร์
- จ่ายครบต้อง release/retire ตามขั้นตอนและออกหลักฐานโอนกรรมสิทธิ์
