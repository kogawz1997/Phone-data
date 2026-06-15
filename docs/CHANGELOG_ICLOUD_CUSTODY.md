# CHANGELOG: iCloud Custody Mode

## เพิ่มใหม่

- เพิ่ม `Device.controlMode`
- เพิ่ม enum `DeviceControlMode`
- เพิ่ม `AppleCustodyRecord`
- เพิ่ม endpoint ร้านสำหรับนำเครื่อง iCloud ร้านเข้าระบบ
- เพิ่ม endpoint Platform Owner สำหรับดู risk รวมทุกร้าน
- เพิ่มหน้า `/apple-custody`
- เพิ่มหน้า `/platform/apple-custody-risk`
- เพิ่ม template `templates/icloud-custody-consent-th.md`
- เพิ่มเอกสาร `docs/apple-icloud-custody-mode-th.md`

## แนวคิด

รองรับร้านที่มีเครื่องผูก iCloud ร้านอยู่แล้ว ให้สามารถนำเข้าระบบการเงินหลักได้ โดยไม่เก็บรหัสผ่านและไม่ทำ bypass Activation Lock
