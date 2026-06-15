# แผนที่ไฟล์ Deploy

```txt
docker-compose.prod.yml                 Compose production stack
infra/docker/Dockerfile.api              API container
infra/docker/Dockerfile.admin            Admin/Store/Platform web container
infra/docker/Dockerfile.customer         Customer portal container
infra/caddy/Caddyfile                    Reverse proxy + HTTPS
.env.production.template                 Production env template
infra/scripts/install-ubuntu-docker.sh   ติดตั้ง Docker บน Ubuntu
infra/scripts/deploy.sh                  build/up/db bootstrap
infra/scripts/update.sh                  rebuild/update stack
infra/scripts/logs.sh                    ดู logs
infra/scripts/backup.sh                  backup PostgreSQL
infra/scripts/restore.sh                 restore PostgreSQL
infra/systemd/koga-mdm.service           auto-start stack หลัง reboot
```
