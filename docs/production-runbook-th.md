# Production Runbook

## Deploy แนะนำ

1. PostgreSQL managed หรือ VPS ที่ backup ได้
2. API หลัง Caddy/Nginx พร้อม HTTPS
3. Admin Web แยก domain เช่น `admin.example.com`
4. Customer Portal เช่น `portal.example.com`
5. ตั้ง `ALLOWED_ORIGINS` เฉพาะ domain จริง
6. ตั้ง `CRON_SECRET` และยิง `/jobs/overdue-check/cron` จาก cron provider
7. เก็บ cert/token ใน `/opt/koga/certs` และ chmod เฉพาะ user ที่รัน API

## คำสั่ง

```bash
pnpm install
pnpm db:generate
pnpm db:push
pnpm bootstrap:prod
pnpm check:env
pnpm check:mdm
pnpm doctor:prod
pnpm build
```

## หลัง deploy

```bash
pnpm smoke:api
curl https://api.example.com/ops/readiness
```

## Rollback

- ห้ามลบ database ทิ้งแบบฮีโร่โง่ ๆ
- restore จาก backup ล่าสุด
- เก็บ audit log ไว้เสมอ
- ถ้า APNs/Android credentials เปลี่ยน ต้องทดสอบกับเครื่องจริงก่อนปล่อยลูกค้า
