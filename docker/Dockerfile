# ─────────────────────────────────────────────────────────────────────────────
# Threads-clone production Dockerfile (multi-stage, single image).
#
# Per spec, one image bundles Next.js (web), Express (server), and BullMQ
# workers. The workers run in the same Node process as the server (see
# apps/server/src/index.ts → startWorkers).
# ─────────────────────────────────────────────────────────────────────────────

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
RUN pnpm build

# ─── runner stage: minimal runtime image ────────────────────────────────────
FROM node:22-alpine AS runner
ENV NODE_ENV=production
RUN apk add --no-cache ffmpeg tini
WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/server/dist apps/server/dist
COPY --from=builder /app/apps/server/package.json apps/server/package.json
COPY --from=builder /app/apps/web/.next apps/web/.next
COPY --from=builder /app/apps/web/public apps/web/public
COPY --from=builder /app/apps/web/package.json apps/web/package.json
COPY --from=builder /app/apps/web/next.config.ts apps/web/next.config.ts
COPY --from=builder /app/packages packages
COPY --from=builder /app/node_modules node_modules

EXPOSE 3000 4000

# tini reaps zombie children (workers, ffmpeg subprocesses).
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/server/dist/index.js"]
