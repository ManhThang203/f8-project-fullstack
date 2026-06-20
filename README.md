# Costy

A production-ready, full-stack Costy-like social media app built with a module-based architecture.

## 🛠 Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend (web)**: Next.js 16 (App Router) + React 19 + Tailwind + Radix UI + `@costy/ui` + TanStack Query + Zustand + react-hook-form/Zod + i18next + socket.io-client
- **Admin**: Next.js 16 (port 3001) + Recharts + Radix UI
- **Backend**: Express 4 (Node 22) + Prisma + Pino + Zod + BullMQ + Socket.io + Helmet + Multer
- **Database**: PostgreSQL 16 + pgvector
- **Cache/Queue**: Redis (ioredis) + BullMQ
- **Auth**: BetterAuth (Google OAuth + email/username + password)
- **Realtime**: Socket.io
- **Media**: Cloudinary (ảnh/video bài viết, avatar, cover) + upload local đĩa VPS cho chat
- **AI**: Vercel AI Gateway + OpenAI (embedding cho hybrid search, gpt-4o-mini cho content moderation)
- **Mail**: Nodemailer
- **i18n**: i18next (vi mặc định, en fallback)

## 📁 Layout

```
.
├── apps/
│   ├── web/        Next.js frontend (BFF cho Express API)
│   ├── admin/      Next.js admin dashboard (BFF riêng, port 3001)
│   └── server/     Express API + Socket.io + BullMQ workers
├── packages/
│   ├── shared/     Shared TS types + Zod schemas + API envelope
│   ├── db/         Prisma schema, client singleton, migrations
│   ├── ui/         Shared UI utilities (cn, tokens)
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

### Run infrastructure (Postgres + Redis)

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
- Admin: <http://localhost:3001>
- API: <http://localhost:4000>
- API Docs (Swagger): <http://localhost:4000/docs>

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

## 👥 Team & Roles

Vai trò được tổng hợp từ lịch sử commit và có thể tinh chỉnh theo thời gian.

| Thành viên | Vai trò chính |
|---|---|
| **Thắng** (`ManhThang203`) | Full-stack / lead — frontend web (`apps/web`), admin dashboard (`apps/admin`), và phần lớn backend (posts, admin/moderation, chat, search, media, socket realtime, auth, mail, notifications) |
| **Khánh** (`midnight`) | Backend & hạ tầng — server modules (posts, chat, users), `packages`, cấu hình `config/env`, BullMQ queues, Docker, tài liệu |

## 🏗 Architecture Notes

- **API surface**: FE calls `/api/v1/*` on Next.js, which proxies to Express via a catch-all route handler (BFF pattern). BetterAuth handler lives in Next route handlers.
- **Module pattern (backend)**: every feature has `<feature>.controller.ts`, `<feature>.service.ts`, `<feature>.routes.ts`, `<feature>.schema.ts`, `<feature>.types.ts`.
- **Module pattern (frontend)**: every feature owns `components/`, `hooks/`, `queries/`, `stores/`, `schemas/`.
- **Error envelope** (uniform): `{ success: true, data, meta }` or `{ success: false, error: { code, message } }`.

Chi tiết kiến trúc, sơ đồ ERD, luồng BFF và danh sách API endpoints: [`docs/architecture.md`](docs/architecture.md).
