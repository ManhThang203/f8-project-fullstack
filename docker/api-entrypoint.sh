#!/bin/sh
# =============================================================================
# Production API entrypoint (docker-compose.yml → service `api`).
# Chạy migrate trước khi start Express — đảm bảo schema DB khớp trước khi nhận traffic.
# =============================================================================
set -e
cd /app

echo "api-entrypoint: prisma migrate deploy..."
pnpm --filter @threads/db exec prisma migrate deploy

echo "api-entrypoint: starting @threads/server..."
exec pnpm --filter @threads/server start
