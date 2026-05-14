#!/bin/sh
set -e
cd /app

echo "api-entrypoint: prisma migrate deploy..."
pnpm --filter @threads/db exec prisma migrate deploy

echo "api-entrypoint: starting @threads/server..."
exec pnpm --filter @threads/server start
