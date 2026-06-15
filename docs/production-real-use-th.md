# เปลี่ยนจาก demo/local เป็นใช้งานจริง

ไฟล์เวอร์ชันนี้เปลี่ยนจุดสำคัญจาก demo/mock ให้เป็น production-prep แล้ว:

- `DEVICE_CONTROL_PROVIDER=android|apple|dual` จะส่งคำสั่งผ่าน adapter จริง ไม่วนกลับไป mock
- Android adapter เรียก Android Management API ด้วย service account จริง
- Apple adapter เตรียม APNs MDM push, mobileconfig endpoint, check-in/connect endpoints และ cert path validation
- เพิ่ม `/devices/:id/mdm/bind` เพื่อผูก provider device name หลัง enroll สำเร็จ
- เพิ่ม `pnpm bootstrap:prod` สำหรับสร้างองค์กรและ owner admin จริง ไม่ต้องใช้ demo seed
- Notification เปลี่ยนเป็น `local|webhook|line` ได้

## โหมดใช้งาน

### Dev/local

```env
DEVICE_CONTROL_PROVIDER=local
NOTIFICATION_PROVIDER=local
```

ใช้ทดสอบ flow สัญญา งวด จ่ายเงิน และ approval โดยไม่แตะเครื่องจริง

### Android จริง

```env
DEVICE_CONTROL_PROVIDER=android
ANDROID_MANAGEMENT_PROJECT_ID=...
ANDROID_MANAGEMENT_ENTERPRISE_NAME=enterprises/LC...
ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON=/opt/koga/certs/google-service-account.json
```

จากนั้น:

```bash
pnpm check:mdm
pnpm dev
```

Flow:

1. Publish policy
2. Create Android enrollment token
3. Factory reset เครื่อง Android
4. Scan QR enrollment
5. เอา device name จาก Android Management API หรือ webhook เช่น `enterprises/xxx/devices/yyy`
6. Bind เข้า device ในหน้า MDM Setup หรือ API `/devices/:id/mdm/bind`
7. ค่อยอนุมัติ Device Action

## iOS / Apple จริง

```env
DEVICE_CONTROL_PROVIDER=apple
APPLE_MDM_BASE_URL=https://api.example.com
APPLE_MDM_APNS_CERT_PATH=/opt/koga/certs/apple-mdm-apns.pem
APPLE_MDM_APNS_KEY_PATH=/opt/koga/certs/apple-mdm-apns-key.pem
APPLE_MDM_APNS_TOPIC=com.apple.mgmt.External.xxxxx
APPLE_ABM_SERVER_TOKEN_PATH=/opt/koga/certs/apple-abm-server-token.p7m
APPLE_MDM_PROFILE_SIGNING_CERT_PATH=/opt/koga/certs/profile-signing.pem
APPLE_MDM_PROFILE_SIGNING_KEY_PATH=/opt/koga/certs/profile-signing-key.pem
```

Flow:

1. สมัคร Apple Business Manager
2. สร้าง/อัปโหลด MDM server cert
3. ได้ ADE server token
4. ซื้อ/เพิ่ม iPhone ผ่าน reseller ที่เข้า ABM ได้
5. Assign device เข้า MDM server
6. เครื่อง check-in ที่ `/mdm/apple/checkin`
7. ระบบเก็บ UDID/deviceToken/PushMagic ถ้าหา device เจอจาก serial หรือ binding
8. อนุมัติคำสั่งผ่าน Device Actions

## Production bootstrap

อย่าใช้ seed demo บน production เด็ดขาด มันเหมือนเอากุญแจบ้านไปแปะหน้าประตูแล้วเขียนว่า “อย่าเปิดนะ”

```bash
cp .env.production.example .env
pnpm install
pnpm db:generate
pnpm db:push
pnpm bootstrap:prod
pnpm check:env
pnpm check:mdm
pnpm dev
```

ต้องตั้ง:

```env
ORG_NAME=
ADMIN_EMAIL=
ADMIN_PASSWORD=
JWT_SECRET=
DATABASE_URL=
```

## สิ่งที่ยังต้องทำเองนอกไฟล์

- สมัคร Google Cloud และเปิด Android Management API
- สร้าง Android Enterprise จริง
- สมัคร Apple Business Manager และยืนยันองค์กร
- ทำ APNs MDM certificate และ ADE token
- ซื้อเครื่องผ่านช่องทางที่ enroll แบบองค์กรได้
- ให้ทนายตรวจสัญญา/consent/PDPA
- ตั้ง payment gateway และ storage จริง

