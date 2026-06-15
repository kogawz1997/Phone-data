# คู่มือ Deploy ขึ้น VPS ด้วย Docker + Caddy

เอกสารนี้สำหรับเอาระบบ KOGA Lease MDM SaaS ขึ้น Ubuntu VPS แบบใช้งานจริง โดยแยก 3 service:

- `admin-web` สำหรับร้านและเจ้าของแพลตฟอร์ม
- `customer-web` สำหรับลูกค้าของแต่ละร้าน
- `api` สำหรับ backend/webhook/MDM callback
- `postgres`, `redis`, `caddy` เป็น service พื้นฐาน

## 1) เตรียม DNS

ชี้ DNS ไปที่ IP ของ VPS:

```txt
app.yourdomain.com      A  <VPS_IP>
customer.yourdomain.com A  <VPS_IP>
api.yourdomain.com      A  <VPS_IP>
```

## 2) ติดตั้ง Docker บน Ubuntu

```bash
sudo bash infra/scripts/install-ubuntu-docker.sh
```

ออกจาก SSH แล้ว login ใหม่หนึ่งรอบถ้าเพิ่งเพิ่ม user เข้า docker group

## 3) ตั้งค่า env

```bash
cp .env.production.template .env
nano .env
```

ต้องแก้อย่างน้อย:

```txt
APP_DOMAIN
CUSTOMER_DOMAIN
API_DOMAIN
PUBLIC_API_URL
ACME_EMAIL
POSTGRES_PASSWORD
ADMIN_EMAIL
ADMIN_PASSWORD
JWT_SECRET
SESSION_SECRET
CRON_SECRET
WEBHOOK_SECRET
ALLOWED_ORIGINS
```

ค่า `CHANGE_ME` ต้องไม่มีเหลือก่อน deploy

## 4) Deploy

```bash
bash infra/scripts/deploy.sh
```

ระบบจะ build container, เปิด stack, push database schema และ bootstrap owner/admin จาก `.env`

## 5) เปิดเว็บ

```txt
Store Console / Platform Owner: https://app.yourdomain.com
Customer Portal:               https://customer.yourdomain.com
API Health:                     https://api.yourdomain.com/health
```

## 6) ดู logs

```bash
bash infra/scripts/logs.sh api
bash infra/scripts/logs.sh admin-web
bash infra/scripts/logs.sh customer-web
bash infra/scripts/logs.sh caddy
```

หรือดูทั้งหมด:

```bash
bash infra/scripts/logs.sh
```

## 7) Backup / Restore

Backup:

```bash
bash infra/scripts/backup.sh
```

Restore:

```bash
bash infra/scripts/restore.sh backups/postgres_YYYYMMDD_HHMMSS.sql.gz
```

## 8) เปิดให้ start หลัง reboot ด้วย systemd

แก้ path ใน `infra/systemd/koga-mdm.service` ให้ตรงกับ path ที่วางโปรเจกต์ เช่น `/opt/koga/phone-finance-mdm`

```bash
sudo cp infra/systemd/koga-mdm.service /etc/systemd/system/koga-mdm.service
sudo systemctl daemon-reload
sudo systemctl enable koga-mdm
sudo systemctl start koga-mdm
```

## 9) สิ่งที่ต้องต่อจริงหลัง deploy

Pilot แบบ manual ใช้ได้ทันทีหลังตั้งค่า domain/env/database แต่ถ้าจะใช้ครบต้องต่อ:

- Storage จริง เช่น Cloudflare R2/S3/Supabase Storage
- Payment Gateway หรือ Slip Verification
- LINE/SMS/Email
- Android Management API
- Apple Business/APNs/ADE

ดูรายละเอียดใน `docs/external/*` และหน้า `/integrations`

## 10) ข้อควรระวัง

- อย่าเปิด API โดยไม่ตั้ง `ALLOWED_ORIGINS`
- อย่าใช้ password ค่า template
- อย่าเก็บ cert/private key ใน Git
- โฟลเดอร์ `certs/` ควร chmod 700
- Backup ฐานข้อมูลทุกวัน
