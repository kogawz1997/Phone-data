# VPS Deployment Draft

วิธีนี้เหมาะกับ MVP pilot ร้านเดียวหรือทีมเล็ก ไม่ใช่ระดับธนาคารชาติที่มีประชุม 17 รอบก่อนตั้งชื่อปุ่ม

## 1. เตรียมเครื่อง

- Ubuntu 22.04/24.04
- Node.js 20+
- pnpm 9+
- PostgreSQL 16 หรือ managed database
- Nginx/Caddy
- Domain 3 ตัวเลือก: admin, customer, api

## 2. ตั้งค่า

```bash
cp .env.production.example .env
pnpm install --frozen-lockfile
pnpm --filter @repo/db db:generate:postgres
pnpm --filter @repo/db db:push:postgres
pnpm db:seed
pnpm build
```

## 3. Run ด้วย process manager

ตัวอย่าง PM2:

```bash
pm2 start "pnpm --filter @koga/api start" --name phone-finance-api
pm2 start "pnpm --filter @koga/admin-web start" --name phone-finance-admin
pm2 start "pnpm --filter @koga/customer-web start" --name phone-finance-customer
pm2 save
```

> API ใช้ `pnpm --filter @koga/api start` ซึ่งรัน `tsx src/main.ts` เพื่อให้ monorepo workspace source ทำงานตรง ๆ ใน MVP

## 4. ตั้ง cron overdue

```bash
0 9 * * * curl -X POST https://api.example.com/jobs/overdue-check/cron -H "x-cron-secret: $CRON_SECRET"
```

ตั้ง `CRON_SECRET` ให้เป็นค่าสุ่มยาว และอย่า commit ลง GitHub เหมือนมนุษย์ผู้มอบกุญแจบ้านให้โลกทั้งใบ
