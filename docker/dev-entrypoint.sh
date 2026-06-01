#!/bin/sh
# =============================================================================
# Dev container entrypoint (docker-compose.dev.yml → service `app`).
# 1) pnpm install nếu volume node_modules trống
# 2) prisma generate + migrate (fallback db push)
# 3) exec CMD (mặc định: tini + pnpm dev)
# =============================================================================
set -e
cd /app

# Root node_modules là named volume — bind-mount repo không ghi đè store pnpm.
if [ ! -f node_modules/.modules.yaml ]; then
  echo "dev-entrypoint: pnpm install (first run or empty node_modules volume)..."
  pnpm install --frozen-lockfile
fi

echo "dev-entrypoint: prisma generate..."
pnpm db:generate

echo "dev-entrypoint: prisma migrate deploy..."
if ! pnpm --filter @costy/db exec prisma migrate deploy; then
  echo "dev-entrypoint: migrate deploy failed (e.g. DB chưa baseline) — chạy db push để đồng bộ schema..."
  pnpm --filter @costy/db exec prisma db push
fi

exec /sbin/tini -- "$@"
