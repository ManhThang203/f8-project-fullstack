# GitHub Actions — CI/CD

## Workflows

| File                | Trigger                                     | Mục đích                                                                     |
| ------------------- | ------------------------------------------- | ---------------------------------------------------------------------------- |
| `ci.yml`            | Push / PR (`main`, `develop`, `feature/**`) | `install` → `db:generate` → `type-check` → `lint` → `format:check` → `build` |
| `release-image.yml` | Push `main`, tag `v*`                       | Build `docker/Dockerfile`, push image lên GHCR                               |

Image: `ghcr.io/<owner>/<repo>` (ví dụ `ghcr.io/manhthang203/f8-project-fullstack:latest`).

## Secrets (Settings → Secrets and variables → Actions)

| Secret                         | Bắt buộc | Mô tả                                                                       |
| ------------------------------ | -------- | --------------------------------------------------------------------------- |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Không    | OAuth client ID cho build Next.js web                                       |
| `NEXT_PUBLIC_SOCKET_URL`       | Không    | URL Socket.io khi build image production (mặc định `http://localhost:4000`) |
| `GITHUB_TOKEN`                 | Tự có    | Workflow `release-image` cần `packages: write` (đã khai báo trong workflow) |
| `TURBO_TOKEN` / `TURBO_TEAM`   | Không    | Remote cache Turbo (tùy chọn, tăng tốc CI)                                  |

## Branch protection (tùy chọn)

Settings → Branches → Add rule cho `main`:

- Require status check: **CI / quality**
- Require pull request before merging (nếu làm nhóm)

## Deploy VPS (sau này)

Khi có VPS: pull image từ GHCR + `docker compose up -d` (workflow `deploy.yml` chưa có).
