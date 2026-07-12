# Costy

Mạng xã hội full-stack (monorepo Turborepo + pnpm): feed & reels, chat realtime, tìm kiếm hybrid, kiểm duyệt AI, và panel quản trị RBAC.

Kiến trúc chính: Next.js BFF → Express module API, hai cụm BetterAuth (web / admin), Postgres + pgvector, Redis + BullMQ, Socket.io.

## Môi trường production

| Thành phần | URL |
|---|---|
| Web | [https://costy.io.vn/](https://costy.io.vn/) |
| Admin | [https://admin.costy.io.vn/](https://admin.costy.io.vn/) |
| API | [http://api.costy.io.vn/](http://api.costy.io.vn/) |
| Swagger | [https://api.costy.io.vn/docs/](https://api.costy.io.vn/docs/) |

## Tài khoản demo (seed)

Tạo bởi `pnpm db:seed` hoặc `pnpm db:seed:accounts` (nguồn: `packages/db/prisma/seed-demo-accounts.ts`).

| Ứng dụng | URL đăng nhập | Email / username | Role | Quyền tóm tắt | Password mặc định |
|---|---|---|---|---|---|
| Admin | [https://admin.costy.io.vn/](https://admin.costy.io.vn/) | `hr1@costy.io.vn` / `hr1` | `SUPER_ADMIN` | Toàn quyền admin (`*`) | `HrDemo@2026` |
| Admin | [https://admin.costy.io.vn/](https://admin.costy.io.vn/) | `hr2@costy.io.vn` / `hr2` | `ADMIN` | Toàn quyền admin (`*`) | `HrDemo@2026` |
| Admin | [https://admin.costy.io.vn/](https://admin.costy.io.vn/) | `hr3@costy.io.vn` / `hr3` | `MODERATOR` | Stats, đọc/duyệt report, ẩn bài | `HrDemo@2026` |
| Web | [https://costy.io.vn/](https://costy.io.vn/) | `demo1@costy.io.vn` / `demo1` | `USER` | Quyền app thường (post, chat, follow…) | `DemoUser@2026` |
| Web | [https://costy.io.vn/](https://costy.io.vn/) | `demo2@costy.io.vn` / `demo2` | `USER` | Quyền app thường | `DemoUser@2026` |

Mật khẩu có thể ghi đè bằng biến môi trường `SEED_HR_PASSWORD` và `SEED_DEMO_PASSWORD`.

## Tech stack

| Lớp | Công nghệ |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Web / Admin | Next.js 16 (App Router) — BFF proxy API + BetterAuth |
| Backend | Express 4 (Node 22), Prisma, Zod, Pino, Helmet |
| Database | PostgreSQL 16 + pgvector |
| Cache / Queue | Redis (ioredis) + BullMQ |
| Auth | BetterAuth (credential + Google OAuth), cookie tách web/admin |
| Realtime | Socket.io (`/chat`, `/feed`, `/notifications`) |
| Media | Cloudinary (post/avatar/cover) + đĩa VPS (chat) |
| AI | Embedding hybrid search + gpt-4o-mini moderation |
| UI | Tailwind, Radix, `@costy/ui`, TanStack Query, Zustand, i18next |

## Cấu trúc monorepo

```
.
├── apps/
│   ├── web/        Next.js — app người dùng (BFF)
│   ├── admin/      Next.js — panel quản trị (BFF riêng)
│   └── server/     Express API + Socket.io + BullMQ workers
├── packages/
│   ├── shared/     Types, Zod schemas, API envelope
│   ├── db/         Prisma schema, migrations, seed
│   ├── ui/         Shared UI utilities
│   ├── eslint-config/
│   └── typescript-config/
└── docker/
    ├── Dockerfile
    └── docker-compose.yml
```

## Chạy local (dev)

### Prerequisites

- Node 22 LTS (`nvm use`)
- pnpm 9 (`corepack enable && corepack prepare pnpm@9.12.3 --activate`)
- Docker Desktop

### Cài đặt & hạ tầng

```bash
pnpm install
cp .env.example .env
cp docker/.env.docker.example docker/.env.docker
pnpm docker:infra:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Chi tiết Docker: [`docker/README.md`](docker/README.md).

## Kiểm thử & chất lượng

```bash
pnpm type-check
pnpm lint
pnpm test
```

## Team

Vai trò tổng hợp từ lịch sử commit; có thể tinh chỉnh theo thời gian.

| Thành viên | Vai trò chính |
|---|---|
| **Thắng** (`ManhThang203`) | Full-stack / lead — `apps/web`, `apps/admin`, phần lớn backend (posts, admin/moderation, chat, search, media, socket, auth, mail, notifications) |
| **Khánh** (`midnight`) | Backend & hạ tầng — server modules, `packages`, `config/env`, BullMQ, Docker, tài liệu |

## Đọc tiếp

Kiến trúc hệ thống, BFF, RBAC, domain dữ liệu, realtime & workers: [`docs/architecture.md`](docs/architecture.md).
