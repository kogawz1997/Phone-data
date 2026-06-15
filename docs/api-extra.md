# Extra API Added in Ready MVP

## Readiness

```http
GET /ops/readiness
```

## CSV Reports

```http
GET /reports/contracts.csv
GET /reports/payments.csv
GET /reports/overdue.csv
Authorization: Bearer <token>
```

## Printable Contract

Admin:

```http
GET /contracts/:id/print
Authorization: Bearer <token>
```

Customer portal:

```http
GET /portal/contracts/:contractNo/print?phone=<phone>
```

## Contact Logs

```http
GET /customers/:id/contact-logs
POST /customers/:id/contact-logs
```

Body:

```json
{
  "channel": "LINE",
  "message": "โทรแจ้งลูกค้าเรื่องงวดค้างแล้ว ลูกค้าขอจ่ายวันที่ 15"
}
```

## Cron Overdue Check

```http
POST /jobs/overdue-check/cron
x-cron-secret: <CRON_SECRET>
```

ใช้สำหรับ cron/PM2/CI เรียกโดยไม่ต้องใช้ admin token
