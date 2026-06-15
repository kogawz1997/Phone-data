# External Ready Changelog

รอบนี้ทำให้ระบบนอกพร้อมหน้างานมากขึ้น โดยแยกเป็น 2 ประเภท:

1. **ทำได้ทันทีในโค้ด**
   - Integration readiness API
   - Test all integrations endpoint
   - Setup plan ต่อ connector
   - Integration Hub UI แบบมีคะแนน readiness
   - Platform integration readiness รวมทุกร้าน
   - PromptPay ID validation
   - Payment gateway setup validator
   - Slip verification setup validator
   - Storage setup validator
   - Local private upload fallback สำหรับ pilot
   - External integration check script

2. **ต้องต่อบัญชี/credential ภายนอก**
   - Google Cloud / Android Management API
   - Apple Business Manager / APNs / ADE
   - Payment gateway merchant account
   - Slip verification provider
   - S3/R2/Supabase Storage
   - LINE/SMS/Email provider

คำสั่งใหม่:

```bash
pnpm external:check
pnpm final:check
```

API ใหม่/อัปเดต:

```txt
GET  /integrations/readiness
GET  /integrations/:id/setup-plan
POST /integrations/:id/test
POST /integrations/test-all
GET  /platform/integrations/readiness
```
