# ระบบทั้งหมดที่ถูกเพิ่มในเวอร์ชัน all-systems

เวอร์ชันนี้รวมรายการที่ลิสไว้ก่อนหน้าเข้าโปรเจกต์หลักแล้ว โดยแยกเป็น 3 ฝั่ง: Platform Owner, Store Console, Customer Portal

## 1. Platform Owner

เพิ่มระบบสำหรับเจ้าของแพลตฟอร์ม:

- Platform MDM Summary: `/platform/mdm/summary`
- Store Health Score: `/platform/store-health`
- Settlement: `/platform/settlements`
- Generate Settlement: `/platform/settlements/generate`
- Platform billing/invoice เดิมยังอยู่
- Apple iCloud Custody Risk เดิมยังอยู่

## 2. Store Operation

เพิ่มระบบสำหรับร้าน:

- Store Ledger: `/store/ledger`
- Customer Risk Score: `/risk/customers`, `/customers/:id/risk-recalculate`
- Collection Tasks: `/collection/tasks`
- Auto generate overdue collection tasks: `/collection/tasks/generate-overdue`
- Dispute Center: `/disputes`
- Template Center: `/templates`
- Automation Rules: `/automation/rules`
- Consent Document Snapshots: `/consent/snapshots`
- Report Export job tracking: `/reports/exports`

## 3. Database ที่เพิ่ม

- PlatformSettlement
- StoreLedgerEntry
- CustomerRiskAssessment
- CollectionTask
- DisputeCase
- NotificationTemplate
- TemplateCenterItem
- AutomationRule
- ConsentDocumentSnapshot
- StoreHealthSnapshot
- ReportExport

## 4. Payment Ledger

เมื่อร้าน confirm payment request แล้ว ระบบจะสร้าง `StoreLedgerEntry` ประเภท `CUSTOMER_PAYMENT` ให้อัตโนมัติ เพื่อเอาไปใช้กับ settlement/report ภายหลัง

## 5. Risk Score

ระบบคำนวณคะแนนเริ่มต้นจาก 80 แล้วหักตามสัญญาค้าง งวดค้าง ข้อมูลไม่ครบ watchlist/blacklist และมูลค่าสัญญารวม

Grade:

- A: 80+
- B: 60-79
- C: 40-59
- D: ต่ำกว่า 40

## 6. Collection Workspace

ระบบสร้าง task จากสัญญาค้างได้ ร้านสามารถสร้างงานเองและอัปเดตสถานะได้

สถานะ:

- OPEN
- IN_PROGRESS
- DONE
- SNOOZED
- CANCELLED

## 7. Dispute Center

รองรับเคส:

- ลูกค้าแจ้งว่าจ่ายแล้ว
- สลิปถูกปฏิเสธ
- ยอดไม่ตรง
- ขอเลื่อนงวด
- เครื่องเสีย/หาย
- เคส iCloud custody

สถานะ:

- OPEN
- WAITING_STORE
- WAITING_CUSTOMER
- RESOLVED
- REJECTED
- ESCALATED

## 8. Template Center + Notification Templates

ระบบสร้างค่าเริ่มต้นให้ร้าน:

- แจ้งเตือนก่อนครบกำหนด 3 วัน
- ครบกำหนดวันนี้
- ค้าง 3 วัน
- ยืนยันรับชำระ
- จ่ายครบ/รอปลดเครื่อง
- สัญญาเช่าใช้พร้อมสิทธิ์ซื้อขาด
- MDM Consent
- Privacy Notice
- iCloud Custody Consent

## 9. Automation Rules

กติกา default:

- ก่อนครบกำหนด 3 วัน → SEND_LINE
- ครบกำหนดวันนี้ → SEND_LINE
- ค้าง 3 วัน → CREATE_COLLECTION_TASK
- จ่ายครบ → CREATE_RELEASE_REQUEST

หมายเหตุ: action แรง เช่น limited mode, lock, wipe ยังต้องผ่าน approval ไม่ auto ตรง ๆ

## 10. สิ่งที่ยังต้องต่อภายนอก

ระบบเตรียมโครงให้แล้ว แต่ยังต้องสมัคร/เชื่อมจริง:

- Android Management API
- Apple Business Manager / APNs / ADE
- Payment Gateway
- Slip Verification
- LINE Messaging API
- SMS Gateway
- S3/R2/Supabase Storage
- Legal review สัญญา/PDPA/MDM consent

## 11. ขอบเขตความปลอดภัย

- ทุกข้อมูลร้านผูก `organizationId`
- ร้านเห็นเฉพาะข้อมูลตัวเอง
- Platform Owner เห็นภาพรวมทุก tenant
- Customer Portal เห็นเฉพาะลูกค้าคนนั้น
- MDM ใช้ของแพลตฟอร์มได้ แต่ map เครื่องเข้าร้านผ่าน `organizationId`
