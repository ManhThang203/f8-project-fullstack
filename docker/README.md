# Docker — chạy Costy production-local

Stack production chạy local trên Windows/Mac bằng Docker Compose: PostgreSQL (pgvector), Redis, API (Express + BullMQ), Web (Next.js), Admin (Next.js).

Toàn bộ URL public dùng hostname `127.0.0.1`. Chọn một hostname và dùng xuyên suốt — không trộn `127.0.0.1` với `localhost`, vì trình duyệt và Google OAuth coi đó là hai origin khác nhau.

## Cấu trúc thư mục

| File                     | Vai trò                                                                       |
| ------------------------ | ----------------------------------------------------------------------------- |
| `docker-compose.yml`     | Stack production-local: `postgres`, `redis`, `api`, `web`, `admin`            |
| `docker-compose.dev.yml` | Stack dev hot-reload (một container `app` + Mailhog)                          |
| `Dockerfile`             | Multi-stage build, một image `costy:local` dùng chung cho web/api/admin       |
| `Dockerfile.dev`         | Image dev (chỉ cài deps, source bind-mount)                                   |
| `api-entrypoint.sh`      | `prisma migrate deploy` + verify hybrid search rồi start API                  |
| `dev-entrypoint.sh`      | install + generate + migrate deploy + verify (không `db push`) rồi `pnpm dev` |
| `.env.docker.example`    | Mẫu biến môi trường — copy thành `.env.docker`                                |

## 1. Chuẩn bị biến môi trường

```bash
cp docker/.env.docker.example docker/.env.docker
```

Điền các giá trị trong `docker/.env.docker`:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth client (server).
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — phải trùng `GOOGLE_CLIENT_ID` (nhúng vào bundle web lúc build).
- `BETTER_AUTH_SECRET` — chuỗi ngẫu nhiên >= 32 ký tự (bắt buộc cho `NODE_ENV=production`).

Các URL public giữ đồng bộ `127.0.0.1`:

```env
SERVER_URL=http://127.0.0.1:4000
WEB_URL=http://127.0.0.1:3000
ADMIN_URL=http://127.0.0.1:3001
BETTER_AUTH_URL=http://127.0.0.1:3000
CORS_ORIGINS=http://127.0.0.1:3000,http://127.0.0.1:3001
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000/api
NEXT_PUBLIC_SOCKET_URL=http://127.0.0.1:4000
```

Các hostname nội bộ Docker giữ nguyên (đừng đổi sang `127.0.0.1`):

```env
DATABASE_URL=
REDIS_URL=redis://redis:6379
UPSTREAM_API_URL=http://api:4000
```

## 2. Cấu hình Google Cloud Console

Vào [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth 2.0 Client ID (Web application):

- Authorized JavaScript origins:
  ```
  http://127.0.0.1:3000
  ```
- Authorized redirect URIs:
  ```
  http://127.0.0.1:3000/api/auth/callback/google
  ```

Lưu ý:

- `127.0.0.1` và `localhost` là **hai URI khác nhau**. Nếu env dùng `127.0.0.1` thì không thêm `localhost` (và ngược lại).
- Nếu OAuth consent screen ở chế độ **Testing**, thêm tài khoản Google của bạn vào danh sách **Test users**.

Redirect URI được Better Auth tạo từ `WEB_URL` (xem `apps/server/src/lib/auth.ts` → `authWeb.baseURL`), nên `WEB_URL` phải khớp chính xác URI khai báo ở trên.

## 3. Khởi động stack

```bash
pnpm docker:up      # build + up -d
pnpm docker:seed    # chỉ chạy lần đầu, seed dữ liệu demo
```

Truy cập:

- Web: <http://127.0.0.1:3000>
- Admin: <http://127.0.0.1:3001>
- API: <http://127.0.0.1:4000>

Luôn mở app bằng `http://127.0.0.1:3000` — không đổi sang `localhost:3000`, nếu không cookie session và OAuth sẽ lệch origin.

## 4. Rebuild sau khi đổi `NEXT_PUBLIC_*`

Next.js nhúng mọi biến `NEXT_PUBLIC_*` (Google Client ID, API URL, Socket URL) vào bundle **lúc build image**. Runtime `env_file` không đổi được các giá trị này. Sau khi thay đổi:

```bash
pnpm docker:rebuild
```

Không dùng `pnpm docker:build` riêng để chạy stack: script đó gọi `docker build` trực tiếp và **không truyền build-arg** từ `.env.docker`, dẫn tới bundle thiếu Google Client ID (nút Google không hiện). Luôn dùng `pnpm docker:up` hoặc `pnpm docker:rebuild` (đã kèm `--env-file`).

## 5. Lệnh thường dùng

| Lệnh                   | Tác dụng                                                         |
| ---------------------- | ---------------------------------------------------------------- |
| `pnpm docker:up`       | Build + chạy stack (detached)                                    |
| `pnpm docker:down`     | Dừng và gỡ container                                             |
| `pnpm docker:rebuild`  | Build lại `--no-cache` rồi up (dùng sau khi đổi `NEXT_PUBLIC_*`) |
| `pnpm docker:migrate`  | Chạy `prisma migrate deploy` trong container `api`               |
| `pnpm docker:seed`     | Seed dữ liệu demo                                                |
| `pnpm docker:infra:up` | Chỉ chạy Postgres + Redis                                        |

## Xử lý sự cố

- **Lỗi `redirect_uri_mismatch`**: URI trong Google Console không khớp `WEB_URL`. Kiểm tra đúng `http://127.0.0.1:3000/api/auth/callback/google` và mở app bằng `127.0.0.1`.
- **Nút Google không hiện**: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` trống lúc build. Điền giá trị rồi `pnpm docker:rebuild`.
- **Lỗi 429 khi test đăng nhập**: mọi request cùng IP container. Đặt `AUTH_RATE_LIMIT_DISABLED=true` trong `.env.docker`.
- **Trùng cổng**: không chạy đồng thời `pnpm docker:up` và `pnpm docker:dev` (cùng dùng 3000/4000/5432/6379).
