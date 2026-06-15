# Lease-to-own Flow

## หลักการ

ร้าน/บริษัทถือกรรมสิทธิ์โทรศัพท์จนกว่าลูกค้าจะชำระครบตามสัญญา ลูกค้าได้รับสิทธิ์ใช้เครื่องระหว่างสัญญาโดยรับทราบว่าเครื่องถูกจัดการด้วย MDM เพื่อคุ้มครองทรัพย์สินและบังคับใช้นโยบายพื้นฐานเท่าที่จำเป็น

## สถานะสำคัญ

### Contract Status

- `DRAFT` - ยังไม่เซ็น
- `ACTIVE` - สัญญามีผล
- `DUE_SOON` - ใกล้ครบกำหนด
- `OVERDUE` - ค้างชำระ
- `GRACE_PERIOD` - อยู่ช่วงผ่อนผัน
- `REVIEW_REQUIRED` - ต้องตรวจสอบก่อน action
- `RESTRICTED` - ถูกจำกัดการใช้งานตาม workflow
- `PAID_OFF` - ชำระครบ
- `CANCELLED` - ยกเลิก

### Legal Title Status

- `ORGANIZATION_OWNED` - ร้าน/บริษัทถือกรรมสิทธิ์
- `TRANSFER_PENDING` - ชำระครบแล้ว รอ release/โอนกรรมสิทธิ์
- `TRANSFERRED` - โอนกรรมสิทธิ์แล้ว
- `RETURNED` - คืนเครื่องแล้ว
- `DISPUTED` - มีข้อพิพาท

### Device Status

- `IN_STOCK` - อยู่ในสต็อก
- `LEASE_ACTIVE` - อยู่ระหว่างสัญญาเช่าใช้/เช่าซื้อ
- `PAID_OFF` - ชำระครบ รอปลด/โอน
- `RELEASED` - ปลด MDM และโอนแล้ว
- `RETURNED`, `LOST`, `DAMAGED`

## Flow จ่ายครบ

```txt
Payment confirmed จนครบทุกงวด
↓
Contract.status = PAID_OFF
Contract.legalTitleStatus = TRANSFER_PENDING
Device.controlStatus = RELEASE_PENDING
↓
สร้าง DeviceAction: REQUEST_RELEASE
↓
Admin อนุมัติ
↓
Provider release/unenroll MDM
↓
ระบบสร้าง DeviceAction: CONFIRM_OWNERSHIP_TRANSFER
↓
Admin ยืนยันเอกสารโอน
↓
Contract.legalTitleStatus = TRANSFERRED
Device.deviceStatus = RELEASED
```

## Flow ค้างชำระ

```txt
ครบกำหนด
↓
แจ้งเตือน
↓
ค้างเกิน policy
↓
สร้าง SEND_REMINDER
↓
ค้างเกิน threshold เช่น 14 วัน
↓
สร้าง REQUEST_LIMITED_MODE
↓
Admin ตรวจ contact log / สัญญา / consent
↓
Approve เฉพาะถ้าถูกเงื่อนไข
```

ห้ามทำ auto-lock ทันที เพราะมันเหมือนเอาระบบอัตโนมัติมารับบทเจ้าหนี้อารมณ์ร้อน ซึ่งไม่มีใครควรภูมิใจ
