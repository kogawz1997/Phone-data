# Legacy iCloud Custody Mode สำหรับร้านที่ใช้ iCloud ร้านอยู่แล้ว

โหมดนี้ทำมาเพื่อร้านที่มีเครื่อง iPhone/iPad ที่ผูก Apple ID หรือ iCloud ของร้านอยู่ก่อนแล้ว และต้องการนำเครื่องเข้าระบบการเงินของร้านให้ทำงานเป็นระบบเดียวกับสัญญา งวดชำระ ลูกค้า และ release workflow

## จุดยืนของระบบ

ระบบนี้เป็น **Tracking / Evidence / Release Workflow** ไม่ใช่ระบบเก็บรหัสผ่าน iCloud และไม่ใช่ระบบปลด Activation Lock แทนร้าน

ระบบทำได้:

- บันทึกว่าเครื่องใช้โหมด `ICLOUD_CUSTODY`
- ผูกเครื่องกับร้านผ่าน `organizationId`
- ผูกเครื่องกับลูกค้าและสัญญาเช่าใช้/เช่าซื้อ
- บันทึก Apple ID alias ของร้าน เช่น `branch-a-device-01@icloud.com`
- บันทึกสถานะ Find My และ Activation Lock จากการตรวจของร้าน
- เก็บหลักฐานรูป/ไฟล์ว่าเครื่องอยู่ในบัญชีร้าน
- เมื่อจ่ายครบ ระบบขึ้น `RELEASE_DUE`
- ร้านปลด iCloud/Find My เองนอกระบบ แล้วอัปโหลดหลักฐาน
- ระบบ mark `RELEASED` และเข้าสู่ขั้นโอนกรรมสิทธิ์

ระบบห้ามทำ:

- ห้ามเก็บรหัสผ่าน Apple ID
- ห้ามเก็บ 2FA code
- ห้ามเก็บ Recovery key
- ห้ามทำ bypass Activation Lock
- ห้ามแนะนำวิธีปลดล็อก iCloud ที่ไม่มีเจ้าของหรือไม่มีหลักฐาน
- ห้ามใช้ iCloud เป็นเครื่องมือข่มขู่หรือแอบติดตามเกินเงื่อนไขสัญญา

## Flow การใช้งานร้าน

```txt
เพิ่ม iPhone เข้าสต็อก
↓
เลือก controlMode = ICLOUD_CUSTODY
↓
กรอก Apple ID alias ของร้าน + หลักฐานเริ่มต้น
↓
สร้างลูกค้า + สัญญา lease-to-own
↓
ลูกค้าเซ็นรับทราบ iCloud custody / MDM consent / PDPA
↓
ลูกค้าจ่ายงวดตามระบบ
↓
จ่ายครบ → ระบบขึ้น Release Due
↓
ร้านปลด iCloud/Find My เอง
↓
ร้านอัปโหลดหลักฐานการปลด
↓
ระบบ mark Released + สร้าง workflow โอนกรรมสิทธิ์
```

## หน้าที่เพิ่ม

ฝั่งร้าน:

```txt
/apple-custody
```

ฝั่งเจ้าของแพลตฟอร์ม:

```txt
/platform/apple-custody-risk
```

## API ที่เพิ่ม

```txt
GET  /apple-custody
POST /devices/:id/apple-custody
PATCH /apple-custody/:id
POST /apple-custody/:id/mark-release-due
POST /apple-custody/:id/mark-released
GET  /platform/apple-custody-risk
```

## Database ที่เพิ่ม

```txt
Device.controlMode = ICLOUD_CUSTODY
AppleCustodyRecord
```

ตาราง `AppleCustodyRecord` เก็บ:

- organizationId
- deviceId
- contractId
- appleIdAlias
- findMyStatus
- activationStatus
- evidenceUrls
- releaseDueAt
- releasedAt
- releaseEvidenceUrls
- checkedByUserId
- releaseCheckedBy
- notes

## ใช้เป็นระบบหลักได้ยังไง

โหมดนี้กลายเป็นหนึ่งใน control mode หลักของเครื่อง Apple ได้:

```txt
NONE
ANDROID_ENTERPRISE
APPLE_MDM_ADE
APPLE_MDM_MANUAL
ICLOUD_CUSTODY
```

ร้านที่ยังไม่มี Apple Business Manager สามารถใช้ `ICLOUD_CUSTODY` เพื่อเอาเครื่องเดิมเข้าระบบการเงินก่อน แล้วอนาคตค่อยย้ายไป `APPLE_MDM_ADE` เมื่อพร้อม

## ข้อควรระวัง

- ร้านต้องมีหลักฐานว่าเครื่องเป็นทรัพย์สินร้านหรืออยู่ในข้อตกลงเช่าใช้/เช่าซื้อ
- ลูกค้าต้องเซ็นรับทราบชัดเจนก่อนรับเครื่อง
- จ่ายครบต้องปลด iCloud/Find My ทันทีตาม workflow
- ถ้าร้านไม่ปลดหลังจ่ายครบ ระบบ Platform Owner ควรเห็นเป็น risk
- อย่าทำให้ระบบนี้ดูเหมือนเป็นเครื่องมือปลดล็อก iCloud เพราะนั่นคือคนละเรื่องและเสี่ยงมาก
