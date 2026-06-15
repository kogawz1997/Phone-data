# คำค้นและทางสมัคร provider/platform

## Android

ค้น:

```txt
Android Management API Google Developers
Android Management API Quickstart
Android Management API signupUrls create
Android Enterprise enrollment token fully managed
Google Cloud enable Android Management API
```

ไปที่:

```txt
Google Cloud Console → APIs & Services → Enable APIs → Android Management API
Google for Developers → Android Management API Quickstart
```

ต้องมี:

```txt
Google Cloud Project
Service Account JSON
Callback URL
Enterprise signup
Device quota
Test Android device
```

## Apple / iOS

ค้น:

```txt
Apple Business sign up verify organization
Apple Business Manager Automated Device Enrollment
Apple MDM APNs Push Certificate
Apple Developer Device Management MDM protocol
Apple ADE server token MDM
```

ไปที่:

```txt
Apple Business
Apple Support: Sign up for Apple Business
Apple Platform Deployment: Automated Device Enrollment
Apple Developer: Device Management
Apple Push Certificates Portal
```

ต้องมี:

```txt
บริษัท/องค์กรจริง
ข้อมูลยืนยันองค์กร / D-U-N-S ถ้าถูกขอ
โดเมนบริษัท
APNs MDM certificate
ADE server token
HTTPS domain
Profile signing certificate
เครื่องที่เข้า Apple Business/ADE ได้
```

## ลำดับที่แนะนำ

```txt
1. ทำ Android ให้ enroll ได้จริงก่อน
2. ทำ Android policy + release flow
3. ค่อยเริ่ม Apple Business/ADE
4. ทำ Apple check-in/connect/APNs
5. ทดสอบจ่ายครบ → release ทั้งสอง platform
```
