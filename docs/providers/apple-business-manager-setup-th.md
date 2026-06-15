# วิธีหาและสมัคร Apple Business Manager สำหรับ iOS/iPhone MDM

## 1) หาได้จากไหน

- เว็บไซต์ Apple Business
- เอกสาร Apple Support: Sign up for Apple Business
- เอกสาร Apple Platform Deployment: Automated Device Enrollment
- เอกสาร Apple Developer: Device Management

คำค้น:

```txt
Apple Business Manager sign up verify organization
Apple Automated Device Enrollment MDM
Apple Device Management MDM protocol
Apple MDM APNs push certificate
```

## 2) ต้องมีอะไร

```txt
- บริษัท/องค์กรจริง
- ข้อมูลยืนยันองค์กร เช่น D-U-N-S หรือข้อมูลธุรกิจที่ Apple รองรับ
- โดเมนบริษัท
- Apple Account สำหรับ admin
- ผู้มีอำนาจรับรององค์กร
- reseller หรือช่องทางซื้อเครื่องที่เพิ่มเข้า Apple Business ได้
```

## 3) สมัคร

1. เข้า Apple Business
2. เลือกสมัครองค์กร
3. กรอกข้อมูลบริษัท
4. ยืนยันโดเมน/ข้อมูลธุรกิจตามที่ Apple ขอ
5. รอ Apple verify
6. สร้าง admin account
7. เพิ่ม MDM server ใน Apple Business
8. ผูกเครื่องจาก reseller/Apple เข้าระบบ

## 4) Flow ที่เข้ากับ lease-to-own

```txt
ร้านซื้อเครื่อง iPhone/iPad ผ่านช่องทางที่เข้า Apple Business ได้
↓
เครื่องเข้า Apple Business Manager
↓
Assign device ไปยัง MDM server ของเรา
↓
ลูกค้าเปิดเครื่องครั้งแรก
↓
Setup Assistant บังคับ enroll เข้า MDM
↓
เครื่องเป็น supervised/company-owned
↓
จ่ายครบ → release/unenroll + โอนกรรมสิทธิ์
```

## 5) จุดที่ระบบเราเตรียมไว้

```txt
packages/device-control/src/adapters/apple-mdm.adapter.ts
apps/api/src/main.ts:
- POST /mdm/apple/enrollment-profile
- POST /mdm/apple/abm/sync
- POST /mdm/apple/checkin
- PUT /mdm/apple/connect
```

## 6) ข้อควรระวัง

- iPhone ที่ซื้อ consumer ทั่วไปอาจไม่ได้เข้า Apple Business/ADE ง่าย ๆ
- ควรซื้อผ่าน reseller ที่รองรับ ABM/ADE
- ใช้กับเครื่องที่ร้านถือกรรมสิทธิ์ก่อนส่งมอบ
- จ่ายครบต้องปลด MDM ตามขั้นตอนและออกเอกสาร release
