#!/bin/sh
# =============================================================================
# Production API entrypoint (docker-compose.yml → service `api`).
# Chạy migrate + verify hybrid search trước khi start Express.
# =============================================================================
set -e
cd /app

echo "api-entrypoint: prisma migrate deploy..."
pnpm --filter @costy/db exec prisma migrate deploy

echo "api-entrypoint: verify hybrid search schema..."
pnpm --filter @costy/db run verify:hybrid-search

echo "api-entrypoint: starting @costy/server..."
exec pnpm --filter @costy/server start
