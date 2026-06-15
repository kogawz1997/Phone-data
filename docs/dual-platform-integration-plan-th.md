# แผนเชื่อม Android + iOS จริง

## Android

- `AndroidManagementAdapter` เรียก API จริงเมื่อ env พร้อม
- รองรับ enterprise signup URL
- รองรับ enterprise create
- รองรับ publish policy
- รองรับ enrollment token + QR payload
- รองรับ device command ผ่าน `devices.issueCommand`

## Apple

- `AppleMdmAdapter` เตรียม mobileconfig, APNs push, check-in/connect และ command queue
- รองรับ optional signing ผ่าน OpenSSL ด้วย `APPLE_SIGN_MOBILECONFIG=true`
- ADE/ABM sync ยังต้องใช้ server token จริงและเครื่องที่ assign ใน Apple Business

## ลำดับทำงาน

1. ทำ Android ให้จบก่อน
2. pilot กับเครื่อง Android 1-3 เครื่อง
3. ค่อยเปิด Apple หลัง APNs/ADE พร้อม
4. ห้ามรวมลูกค้าจริงก่อนทดสอบ release workflow ครบ
