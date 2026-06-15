# CURL examples

ใช้ `ADMIN_EMAIL` / `ADMIN_PASSWORD` จาก `.env` ของจริง

```bash
BASE=${NEXT_PUBLIC_API_BASE_URL:-http://localhost:4000}
TOKEN=$(curl -s "$BASE/auth/login" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | jq -r '.data.token')

curl -H "Authorization: Bearer $TOKEN" "$BASE/reports/summary" | jq
```

## Android Enterprise signup URL

```bash
curl -X POST "$BASE/mdm/android/signup-url" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"adminEmail":"it@example.com","callbackUrl":"https://api.example.com/mdm/android/signup-callback"}' | jq
```

## Payment webhook

```bash
curl -X POST "$BASE/payments/webhook" \
  -H "x-koga-webhook-secret: $PAYMENT_WEBHOOK_SECRET" \
  -H 'content-type: application/json' \
  -d '{"paymentId":"PAYMENT_ID","status":"paid","amount":1000}' | jq
```
