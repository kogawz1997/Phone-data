# Changelog: Lease-to-own A Model

## ปรับจากโปรเจกต์แรกเป็นโมเดล A

- เปลี่ยนข้อความหลักใน Admin/Customer UI เป็น Lease-to-own
- เพิ่ม schema สำหรับกรรมสิทธิ์:
  - `agreementType`
  - `legalTitleStatus`
  - `managementPurpose`
  - `releaseDueAt`
  - `releaseCompletedAt`
  - `ownershipTransferredAt`
- เพิ่ม status เครื่อง:
  - `LEASE_ACTIVE`
  - `RELEASED`
- เพิ่ม consent types:
  - `LEASE_TO_OWN_TERMS`
  - `OWNERSHIP_RETENTION`
  - `RELEASE_PROCESS`
- เพิ่ม device action types:
  - `REQUEST_LIMITED_MODE`
  - `CONFIRM_OWNERSHIP_TRANSFER`
- ปรับ safe policy ให้ไม่อนุญาตจำกัดเครื่องหลังจ่ายครบ/โอนกรรมสิทธิ์แล้ว
- จ่ายครบแล้วระบบสร้าง `REQUEST_RELEASE`
- อนุมัติ release แล้วระบบสร้าง `CONFIRM_OWNERSHIP_TRANSFER`
- อนุมัติโอนกรรมสิทธิ์แล้วเปลี่ยน `legalTitleStatus = TRANSFERRED`
- เพิ่ม template สัญญาและ consent ใหม่
- เพิ่ม docs สำหรับ legal/platform/provider integration

## ยังไม่ใช่ของจริง

- device-control ยังเป็น mock
- payment ยังเป็น manual
- legal docs ยังต้องให้ทนายตรวจ
