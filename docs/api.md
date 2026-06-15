# API Summary

Base URL: `http://localhost:4000`

## Auth

```txt
POST /auth/login
GET  /auth/me
```

## Admin Resources

```txt
GET  /customers
POST /customers
GET  /customers/:id
PATCH /customers/:id

GET  /devices
POST /devices
GET  /devices/:id
PATCH /devices/:id

GET  /contracts
POST /contracts
GET  /contracts/:id
POST /contracts/:id/sign
POST /contracts/:id/cancel

GET  /payments
POST /payments
POST /payments/:id/confirm
POST /payments/:id/reject

GET  /device-actions
POST /device-actions/:id/approve
POST /device-actions/:id/reject

POST /jobs/overdue-check
GET  /reports/summary
```

## Customer Portal

```txt
GET  /portal/contracts/:contractNo?phone=08xxxxxxxx
POST /portal/contracts/:contractId/payments
```
