# =============================================================================
# Production Dockerfile — multi-stage, một image cho web + API.
#
# Next.js (web), Express (server) và BullMQ workers dùng chung image;
# workers chạy trong process server (apps/server/src/index.ts → startWorkers).
#
# Build: docker compose -f docker/docker-compose.yml build
#        hoặc pnpm docker:build
# =============================================================================

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# ─── deps stage: install full dependency graph ──────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
RUN pnpm install --frozen-lockfile

# ─── builder stage: type-check + build ──────────────────────────────────────
FROM base AS builder
COPY --from=deps /app /app
COPY . .
# Prisma Generate reads `DATABASE_URL` via `prisma.config.ts` / `env()`; URL is not embedded in the schema.
ENV DATABASE_URL="postgresql://threads:threads@localhost:5432/threads?schema=public"
RUN pnpm --filter @threads/db generate

# Next.js nhúng `NEXT_PUBLIC_*` vào JS lúc `pnpm build` — runtime `env_file` không đổi được giá trị đã build.
# Truyền qua `docker compose build` (xem docker-compose.yml `args`) hoặc `docker build --build-arg ...`.
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
ARG NEXT_PUBLIC_DEMO_USER_ID=seed_demo_user_001
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_DEMO_USER_ID=$NEXT_PUBLIC_DEMO_USER_ID

RUN pnpm build

# ─── runner stage: minimal runtime image ────────────────────────────────────
FROM node:22-alpine AS runner
ENV NODE_ENV=production
RUN apk add --no-cache ffmpeg tini
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
WORKDIR /app

# Workspace root manifests + lockfile (pnpm hoạt động ở runtime).
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./

# Server: dist + src (một số path runtime) + package.json.
COPY --from=builder /app/apps/server/dist apps/server/dist
COPY --from=builder /app/apps/server/src apps/server/src
COPY --from=builder /app/apps/server/package.json apps/server/package.json
# Web: build output Next + static assets.
COPY --from=builder /app/apps/web/.next apps/web/.next
COPY --from=builder /app/apps/web/public apps/web/public
COPY --from=builder /app/apps/web/package.json apps/web/package.json
COPY --from=builder /app/apps/web/next.config.ts apps/web/next.config.ts
COPY --from=builder /app/packages packages
COPY --from=builder /app/node_modules node_modules
# pnpm workspace: each app resolves deps via its own node_modules symlinks into .pnpm (root alone is not enough).
COPY --from=builder /app/apps/server/node_modules apps/server/node_modules
COPY --from=builder /app/apps/web/node_modules apps/web/node_modules

# 3000 = Next (service web), 4000 = Express + Socket.io (service api).
EXPOSE 3000 4000

COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
# Windows checkout có thể để CRLF → shebang hỏng trong Linux.
RUN sed -i 's/\r$//' /usr/local/bin/api-entrypoint.sh && chmod +x /usr/local/bin/api-entrypoint.sh

# tini reaps zombie children (workers, ffmpeg subprocesses).
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["pnpm", "--filter", "@threads/server", "start"]
