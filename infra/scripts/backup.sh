#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi
source .env
mkdir -p backups
TS="$(date +%Y%m%d_%H%M%S)"
OUT="backups/postgres_${TS}.sql.gz"

echo "Creating database backup: $OUT"
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U "${POSTGRES_USER:-koga}" "${POSTGRES_DB:-koga_mdm}" | gzip > "$OUT"

echo "Backup done: $OUT"
