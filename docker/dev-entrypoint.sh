#!/bin/sh
set -e
cd /app

# Root is a named volume so host bind-mount does not overwrite pnpm's store layout.
if [ ! -f node_modules/.modules.yaml ]; then
  echo "dev-entrypoint: pnpm install (first run or empty node_modules volume)..."
  pnpm install --frozen-lockfile
fi

echo "dev-entrypoint: prisma generate..."
pnpm db:generate

echo "dev-entrypoint: prisma migrate deploy..."
if ! pnpm --filter @threads/db exec prisma migrate deploy; then
  echo "dev-entrypoint: migrate deploy failed (e.g. DB chưa baseline) — chạy db push để đồng bộ schema..."
  pnpm --filter @threads/db exec prisma db push
fi

exec /sbin/tini -- "$@"
