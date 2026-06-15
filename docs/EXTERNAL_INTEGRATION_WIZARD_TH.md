# External Integration Wizard

เอกสารนี้คือแผนกรอกข้อมูลระบบนอกเข้าหน้า `/integrations` และ `/platform/integrations`

## Android Management API

หน้าที่ในระบบ: สร้าง QR enrollment, publish policy, sync device, command/release

ต้องใช้:
- `ANDROID_MANAGEMENT_PROJECT_ID`
- `ANDROID_MANAGEMENT_ENTERPRISE_NAME`
- `ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON`
- `ANDROID_MANAGEMENT_CALLBACK_URL`

ขั้นตอน:
1. เปิด Google Cloud Console
2. Enable Android Management API
3. สร้าง service account
4. ทำ enterprise signup flow ในหน้า MDM Setup
5. ได้ enterprise name แล้วใส่ `.env`
6. ทดสอบสร้าง enrollment token
7. สแกน QR ด้วยเครื่อง Android factory reset

## Apple MDM / Apple Business

หน้าที่ในระบบ: enrollment profile, check-in/connect, APNs push, ADE sync, release

ต้องใช้:
- `APPLE_MDM_BASE_URL`
- `APPLE_MDM_APNS_CERT_PATH`
- `APPLE_MDM_APNS_KEY_PATH`
- `APPLE_MDM_APNS_TOPIC`
- `APPLE_ABM_SERVER_TOKEN_PATH`
- `APPLE_MDM_PROFILE_SIGNING_CERT_PATH`
- `APPLE_MDM_PROFILE_SIGNING_KEY_PATH`

ขั้นตอน:
1. สมัคร/verify Apple Business Manager
2. สร้าง MDM server record
3. ทำ APNs MDM certificate
4. download ADE server token
5. ตั้ง public HTTPS domain
6. ใส่ path cert/token ใน server
7. ทดสอบ `GET /mdm/apple/enroll/:id.mobileconfig`
8. ทดสอบ iPhone supervised/ADE จริง

## PromptPay / Payment Gateway

เริ่มต้นใช้ manual PromptPay ได้ทันที โดยร้านตั้ง PromptPay ใน `/store/payment-settings`

ถ้าต่อ gateway:
- `PAYMENT_GATEWAY_PROVIDER`
- `PAYMENT_GATEWAY_WEBHOOK_SECRET`
- callback เข้า `/payments/webhook`

## Storage

ใช้เก็บไฟล์:
- สลิป
- รูปเครื่อง
- เอกสารลูกค้า
- PDF สัญญา
- หลักฐาน iCloud/release

ตั้งค่า:
- `STORAGE_PROVIDER`
- `STORAGE_BUCKET`
- `STORAGE_ENDPOINT`
- `STORAGE_ACCESS_KEY_ID`
- `STORAGE_SECRET_ACCESS_KEY`

## LINE/SMS

LINE:
- สร้าง LINE Official Account
- Enable Messaging API
- ใส่ `LINE_CHANNEL_ACCESS_TOKEN`

SMS:
- เลือก provider
- ใส่ `SMS_PROVIDER` และ key/webhook ที่เกี่ยวข้อง

