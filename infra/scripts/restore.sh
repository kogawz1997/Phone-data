#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
  echo "Usage: bash infra/scripts/restore.sh backups/postgres_YYYYMMDD_HHMMSS.sql.gz"
  exit 1
fi

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi
source .env

echo "Restoring $BACKUP_FILE into ${POSTGRES_DB:-koga_mdm}. This will overwrite data."
read -r -p "Type RESTORE to continue: " CONFIRM
if [[ "$CONFIRM" != "RESTORE" ]]; then
  echo "Cancelled"
  exit 1
fi

gunzip -c "$BACKUP_FILE" | docker compose -f docker-compose.prod.yml exec -T postgres psql -U "${POSTGRES_USER:-koga}" "${POSTGRES_DB:-koga_mdm}"
echo "Restore complete"
