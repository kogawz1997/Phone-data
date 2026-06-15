# Provider Integration Plan

## จุดเสียบโค้ด

```txt
packages/device-control/src/mock-adapter.ts
packages/device-control/src/types.ts
```

ให้สร้าง adapter ใหม่ เช่น:

```txt
packages/device-control/src/android-enterprise-adapter.ts
packages/device-control/src/samsung-knox-adapter.ts
packages/device-control/src/vendor-adapter.ts
```

## Interface ที่ต้องรองรับ

- `enrollDevice`
- `sendReminder`
- `requestLimitedMode`
- `requestRestriction`
- `releaseDevice`
- `confirmOwnershipTransfer`

## Environment Variables ที่ควรเพิ่ม

```env
DEVICE_CONTROL_PROVIDER="mock"
DEVICE_CONTROL_API_URL=""
DEVICE_CONTROL_API_KEY=""
DEVICE_CONTROL_WEBHOOK_SECRET=""
DEVICE_CONTROL_DRY_RUN="true"
```

## Webhook ที่ควรเพิ่มภายหลัง

```txt
POST /device-control/webhook
```

Payload ที่ควรรับ:

- provider action id
- device id / IMEI / serial
- action status
- result
- error reason
- timestamp

## Testing Plan

1. ทดสอบ mock ใน sandbox
2. เปิด dry-run กับ provider จริง
3. ทดสอบ enroll เครื่อง test
4. ทดสอบ reminder
5. ทดสอบ limited mode เฉพาะเครื่อง test
6. ทดสอบ release หลัง paid off
7. ทดสอบ ownership transfer document
8. บันทึก audit ทุกขั้น

อย่าเอาเครื่องลูกค้าจริงมาเป็นหนูทดลอง เพราะนั่นไม่ใช่ QA นั่นคือความกล้าแบบผิดประเภท
