# แผนความพร้อม 100% สำหรับ Phone Finance MDM

คำว่า 100% ในโปรเจกต์นี้แปลว่า **โค้ด หน้าจอ endpoint และคู่มือพร้อมสำหรับการเสียบ credential จริง** ไม่ได้แปลว่า Google/Apple อนุมัติบัญชีให้แล้วโดยอัตโนมัติ เพราะถ้า unzip แล้วได้ Apple Business Manager เลย โลกคงเสียสมดุลไปนานแล้ว

## สถานะที่ทำให้ในไฟล์แล้ว

| หมวด | สถานะ |
|---|---|
| Auth production bootstrap | พร้อม |
| Admin/Customer web | พร้อมต่อใช้งานจริง |
| DB schema | พร้อม SQLite dev / PostgreSQL production |
| Lease-to-own contract flow | พร้อม |
| Consent/release/ownership flow | พร้อม |
| Payment manual + webhook | พร้อม endpoint |
| Upload slips/docs | พร้อม local endpoint, production ควรต่อ private storage |
| Notification local/webhook/LINE | พร้อม |
| Android Enterprise signup URL | พร้อม endpoint |
| Android Enterprise create | พร้อม endpoint |
| Android policy/enrollment/command | พร้อม adapter |
| Apple enrollment profile | พร้อม endpoint + optional OpenSSL signing |
| Apple check-in/connect | พร้อม endpoint + command queue |
| APNs MDM push | พร้อม adapter |
| Cron overdue | พร้อม secret |
| Audit log | พร้อม |
| Production checks | พร้อม |

## สิ่งที่ต้องทำข้างนอก

1. สร้าง Google Cloud Project และเปิด Android Management API
2. สร้าง Service Account JSON
3. ทำ Android Enterprise signup flow
4. ขอ device quota ก่อน provision เครื่องจริง ถ้าบัญชีต้องใช้ quota
5. สมัคร Apple Business Manager และ verify องค์กร
6. ทำ APNs MDM certificate
7. เพิ่ม MDM server ใน Apple Business และดาวน์โหลด ADE server token
8. ซื้อ/assign เครื่องที่ enroll ได้ผ่านช่องทางองค์กร
9. ตั้ง HTTPS domain จริง
10. ต่อ payment gateway/SMS/storage provider จริง
11. ให้ทนายตรวจสัญญาและ privacy notice

## เกณฑ์ผ่านก่อน pilot

- `pnpm doctor:prod` ผ่าน
- `pnpm check:mdm` ผ่านหรือผ่านเฉพาะ platform ที่จะใช้ก่อน
- Android enroll เครื่องจริงได้อย่างน้อย 1 เครื่อง
- Apple supervised/ADE check-in ได้อย่างน้อย 1 เครื่องก่อนเปิดขาย iOS
- จ่ายครบแล้ว release workflow สำเร็จ
- ค้างงวดแล้ว action ต้องผ่าน approval, ไม่ auto-lock ทันที
- Audit log มีครบทุกการกระทำ
