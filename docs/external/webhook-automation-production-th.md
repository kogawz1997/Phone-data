# Webhook / Automation Production Guide

ใช้สำหรับต่อระบบนอก เช่น accounting, CRM, data warehouse หรือ workflow ภายนอก

```env
NOTIFICATION_PROVIDER="webhook"
NOTIFICATION_WEBHOOK_URL="https://example.com/koga-webhook"
NOTIFICATION_WEBHOOK_SECRET="สุ่มยาวๆ"
```

Header ที่ระบบส่ง:

```txt
x-koga-webhook-secret: <NOTIFICATION_WEBHOOK_SECRET>
```

Event ที่ควรรองรับ:

```txt
payment_request_created
payment_confirmed
installment_overdue
collection_task_created
device_release_requested
icloud_release_due
contract_paid_off
store_invoice_created
```

แนวทาง production:

1. provider ต้องตอบภายใน 5-10 วินาที
2. ถ้า timeout ให้ retry ผ่าน queue
3. เก็บ webhook log
4. sign payload ด้วย HMAC ใน phase ถัดไป
5. อย่าส่งข้อมูลส่วนบุคคลเกินจำเป็น
