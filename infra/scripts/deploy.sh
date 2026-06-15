#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found. Run: sudo bash infra/scripts/install-ubuntu-docker.sh"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin not found. Install docker compose plugin first."
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.production.template .env
  echo "Created .env from .env.production.template"
  echo "Edit .env first, then run this script again."
  exit 1
fi

mkdir -p uploads backups certs
chmod 700 certs || true

if grep -q "CHANGE_ME" .env; then
  echo "Your .env still contains CHANGE_ME values. Fix them before deploy."
  exit 1
fi

echo "Building and starting production stack..."
docker compose -f docker-compose.prod.yml up -d --build

echo "Running database generation/push/bootstrap inside API container..."
docker compose -f docker-compose.prod.yml exec -T api pnpm db:generate
docker compose -f docker-compose.prod.yml exec -T api pnpm db:push
docker compose -f docker-compose.prod.yml exec -T api pnpm bootstrap:prod || true

echo "Health check..."
sleep 3
docker compose -f docker-compose.prod.yml ps

echo "Done. Open your domains from .env: APP_DOMAIN / CUSTOMER_DOMAIN / API_DOMAIN"
