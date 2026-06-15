# API Module Map

| Module | Routes | Tenant Rule |
|---|---|---|
| auth | /auth/* | session based |
| platform | /platform/* | PLATFORM_OWNER only |
| store | /store/*, /public/store-signup | store scoped except signup |
| customers | /customers/*, /customer-users/* | organizationId required |
| devices | /devices/*, /device-actions/* | organizationId via device/contract |
| contracts | /contracts/* | organizationId required |
| payments | /payments/*, /payment-requests/* | organizationId required |
| portal | /portal/* | customer portal token scoped to customer + organization |
| mdm | /mdm/* | provider credentials are platform-owned, device is store-scoped |
| apple-custody | /apple-custody/* | organizationId required |
| collection | /collection/* | organizationId required |
| disputes | /disputes/* | organizationId required |
| templates | /templates/* | organizationId or system template |
| automation | /automation/* | organizationId required |
| reports | /reports/* | organizationId unless platform report |
| integrations | /integrations/* | organizationId required |

ดู route inventory ที่สร้างจากโค้ดจริงได้ที่ `docs/architecture/api-route-inventory.json`
