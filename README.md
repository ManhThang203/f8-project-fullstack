# Costy

A production-ready, full-stack Costy-like social media app built with a module-based architecture.

## 🛠 Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js (App Router) + Tailwind + shadcn/ui + Zustand + TanStack Query
- **Backend**: Express.js (Node 22) + Prisma + Pino + Zod
- **Database**: PostgreSQL 16 + pgvector
- **Cache/Queue**: Redis + BullMQ
- **Auth**: BetterAuth (Gmail OAuth + Phone/OTP)
- **Realtime**: Socket.io
- **Media**: MinIO (temp) → BullMQ + FFmpeg → Cloudflare R2 (permanent)
- **Notifications**: Novu + Nodemailer
- **i18n**: i18next (vi default, en fallback)

## 📁 Layout

```
.
├── apps/
│   ├── web/        Next.js frontend (BFF for the Express API)
│   └── server/     Express API + Socket.io + BullMQ workers
├── packages/
│   ├── shared/     Shared TS types + Zod schemas + API envelope
│   ├── db/         Prisma schema, client singleton, migrations
│   ├── eslint-config/
│   └── typescript-config/
└── docker/
    ├── Dockerfile
    └── docker-compose.yml
```

## 🚀 Quick Start

### Prerequisites

- Node 22 LTS (`nvm use`)
- pnpm 9 (`corepack enable && corepack prepare pnpm@9.12.3 --activate`)
- Docker Desktop

### Install

```bash
pnpm install
cp .env.example .env          # for local `pnpm dev` outside Docker (optional if you only use containers)
cp docker/.env.docker.example docker/.env.docker   # Docker stack: edit secrets in docker/.env.docker
```

### Run infrastructure (Postgres + Redis + MinIO)

The Compose stack reads **`docker/.env.docker`**. Root **`pnpm docker:*`** scripts already pass `--env-file docker/.env.docker`, so you do **not** need a repo-root `.env` for Docker. See [`docker/README.md`](docker/README.md).

```bash
pnpm docker:up
```

### Generate Prisma client & run migrations

```bash
pnpm db:generate
pnpm db:migrate
```

### Dev servers

```bash
pnpm dev
```

- Web: <http://localhost:3000>
- API: <http://localhost:4000>
- API Docs (Swagger): <http://localhost:4000/docs>
- MinIO Console: <http://localhost:9001>

## 🧪 Tests, Lint, Type-check

```bash
pnpm type-check
pnpm lint
pnpm test
```

## 📦 Build & Deploy

Single multi-stage Docker image bundles `web`, `server`, and workers:

```bash
pnpm docker:build
```

## 🏗 Architecture Notes

- **API surface**: FE calls `/api/v1/*` on Next.js, which proxies to Express via a catch-all route handler (BFF pattern). BetterAuth handler lives in Next route handlers.
- **Module pattern (backend)**: every feature has `<feature>.controller.ts`, `<feature>.service.ts`, `<feature>.routes.ts`, `<feature>.schema.ts`, `<feature>.types.ts`.
- **Module pattern (frontend)**: every feature owns `components/`, `hooks/`, `queries/`, `stores/`, `schemas/`.
- **Error envelope** (uniform): `{ success: true, data, meta }` or `{ success: false, error: { code, message } }`.

See module-level READMEs (added in later phases) for deeper detail.
