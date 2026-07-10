#!/bin/sh
# =============================================================================
# Dev container entrypoint (docker-compose.dev.yml → service `app`).
# 1) pnpm install nếu volume node_modules trống
# 2) prisma generate + migrate deploy (no db push — drops search_vector)
# 3) verify hybrid search schema
# 4) exec CMD (mặc định: tini + pnpm dev)
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
  echo "dev-entrypoint: migrate deploy failed."
  echo "  Do NOT use prisma db push — it drops search_vector / GIN / HNSW."
  echo "  Fix: baseline migrations or run: pnpm --filter @costy/db migrate:deploy"
  exit 1
fi

echo "dev-entrypoint: verify hybrid search schema..."
pnpm --filter @costy/db run verify:hybrid-search

exec /sbin/tini -- "$@"
