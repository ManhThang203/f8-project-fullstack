# Kiến trúc Costy

Tài liệu mô tả kiến trúc tổng thể, luồng BFF, sơ đồ cơ sở dữ liệu và danh sách API endpoints chính của dự án Costy.

## Tổng quan

Costy là ứng dụng mạng xã hội full-stack, tổ chức theo monorepo Turborepo + pnpm workspaces. Frontend (Next.js) đóng vai trò **BFF (Backend-for-Frontend)**, proxy các request API tới Express backend. Realtime qua Socket.io; xử lý nền qua BullMQ workers.

### Tech stack

| Lớp | Công nghệ |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Frontend (web) | Next.js 16 (App Router), React 19, Tailwind, Radix UI, `@costy/ui`, TanStack Query, Zustand, react-hook-form/Zod, i18next, socket.io-client |
| Admin | Next.js 16 (`apps/admin`, port 3001), Recharts, Radix UI — BFF riêng cho panel quản trị |
| Backend | Express 4 (Node 22), Prisma, Pino, Zod, BullMQ, Socket.io, Helmet, Multer |
| Database | PostgreSQL 16 + pgvector |
| Cache / Queue | Redis (ioredis) + BullMQ |
| Auth | BetterAuth (Google OAuth + email/username + password) |
| Realtime | Socket.io (namespaces `/chat`, `/feed`, `/notifications`) |
| Media | Cloudinary (ảnh/video bài viết, avatar, cover) + upload local đĩa VPS cho chat |
| AI | Vercel AI Gateway + OpenAI (embedding hybrid search, gpt-4o-mini content moderation) |
| Mail | Nodemailer |
| i18n | i18next (vi mặc định, en fallback) |

### Cấu trúc thư mục

```
.
├── apps/
│   ├── web/        Next.js frontend (BFF cho Express API)
│   ├── admin/      Next.js admin dashboard (BFF riêng)
│   └── server/     Express API + Socket.io + BullMQ workers
├── packages/
│   ├── shared/     Shared TS types, Zod schemas, API envelope
│   ├── db/         Prisma schema, client, migrations
│   ├── ui/         Shared UI utilities (cn, tokens)
│   ├── eslint-config/
│   └── typescript-config/
└── docker/
    ├── Dockerfile
    └── docker-compose.yml
```

## Sơ đồ kiến trúc tổng thể

```mermaid
flowchart TB
    subgraph client [Client]
        Browser[Browser]
    end

    subgraph web [apps/web - Next.js BFF]
        WebPages[App Router pages]
        BffV1["/api/v1/* proxy"]
        BffAuth["/api/auth/* proxy"]
    end

    subgraph admin [apps/admin - Next.js BFF]
        AdminPages[Admin pages]
        AdminBffV1["/api/v1/* proxy"]
        AdminBffAuth["/api/admin/auth/* proxy"]
    end

    subgraph server [apps/server - Express]
        ExpressAPI["/api/v1/* REST"]
        AuthWeb["/api/auth/* BetterAuth web"]
        AuthAdmin["/api/admin/auth/* BetterAuth admin"]
        SocketIO[Socket.io server]
    end

    subgraph workers [BullMQ Workers]
        MediaWorker[Media]
        EmailWorker[Email]
        NotifWorker[Notification]
        EmbedWorker[Embedding]
        ModerationWorker[ContentModeration]
        CleanupWorker[MediaCleanup]
        TrendingWorker[TrendingHashtags]
    end

    subgraph infra [Infrastructure]
        Postgres[(PostgreSQL + pgvector)]
        Redis[(Redis)]
        Cloudinary[(Cloudinary)]
        LocalDisk[(Local disk VPS)]
    end

    Browser --> WebPages
    Browser --> BffV1
    Browser --> BffAuth
    Browser -->|"WebSocket"| SocketIO

    AdminPages --> AdminBffV1
    AdminPages --> AdminBffAuth

    BffV1 --> ExpressAPI
    BffAuth --> AuthWeb
    AdminBffV1 --> ExpressAPI
    AdminBffAuth --> AuthAdmin

    ExpressAPI --> Postgres
    ExpressAPI --> Redis
    ExpressAPI --> Cloudinary
    ExpressAPI --> LocalDisk
    SocketIO --> Redis
    workers --> Postgres
    workers --> Redis
    workers --> Cloudinary
```

## Luồng BFF

Trình duyệt **không** gọi trực tiếp Express (`localhost:4000`). Mọi request đi qua Next.js cùng origin để cookie session hoạt động đúng, tránh CORS và giữ IP thật của client qua header `X-Forwarded-*`.

```mermaid
sequenceDiagram
    participant Browser
    participant NextBFF as Next.js BFF
    participant Express as Express API
    participant DB as PostgreSQL

    Browser->>NextBFF: GET /api/v1/posts?cursor=...
    Note over Browser,NextBFF: Same-origin, cookie session tự gửi kèm

    NextBFF->>NextBFF: Forward headers, loại hop-by-hop
    NextBFF->>NextBFF: Gắn X-Forwarded-Host/Proto/For

    NextBFF->>Express: GET http://localhost:4000/api/v1/posts
    Express->>Express: attachWebAuthSession
    Express->>Express: attachAuthContext
    Express->>DB: Query posts
    DB-->>Express: Rows
    Express-->>NextBFF: JSON response stream 1:1
    NextBFF-->>Browser: JSON response
```

### Hai cụm auth riêng biệt

| Cụm | Cookie namespace | Mount trên Express | Proxy từ |
|---|---|---|---|
| Web user | `costy-web` (BetterAuth web) | `/api/auth/*` | `apps/web` → `/api/auth/*` |
| Admin panel | `costy-admin` (BetterAuth admin) | `/api/admin/auth/*` | `apps/admin` → `/api/admin/auth/*` |

Middleware session trên `/api/v1/*`:

- Route thường: `attachWebAuthSession` → `attachAuthContext` → `blockInactiveUsers`
- Route admin (`/api/v1/admin/*`): `attachAdminAuthSession` → permission guards (`requireAdminPanelAccess`, `requirePermission`)

Nguồn: [`apps/web/app/api/v1/[...path]/route.ts`](../apps/web/app/api/v1/[...path]/route.ts), [`apps/server/src/app.ts`](../apps/server/src/app.ts)

## Sơ đồ cơ sở dữ liệu (ERD)

Sinh từ [`packages/db/prisma/schema.prisma`](../packages/db/prisma/schema.prisma).

### RBAC & Admin

```mermaid
erDiagram
    User ||--o{ UserPermission : has
    User ||--o{ AdminAuditLog : performs
    Permission ||--o{ RolePermission : assigned_to
    Permission ||--o{ UserPermission : granted_via

    Permission {
        string id PK
        string key UK
        string domain
        string label
    }

    RolePermission {
        Role role PK
        string permissionId PK
    }

    UserPermission {
        string userId PK
        string permissionId PK
        PermissionEffect effect
        string grantedById
    }

    AdminAuditLog {
        string id PK
        string actorId FK
        string action
        string targetType
        string targetId
    }
```

### Moderation & Hashtag

```mermaid
erDiagram
    User ||--o{ Report : submits
    User ||--o{ Report : reviews
    User ||--o{ ModerationCase : author
    User ||--o{ ModerationCase : reviews
    User ||--o{ Appeal : submits
    ModerationCase ||--o| Appeal : has
    Post ||--o{ PostHashtag : tagged
    Hashtag ||--o{ PostHashtag : used_in

    Report {
        string id PK
        string reporterId FK
        ReportTargetType targetType
        string targetId
        ReportReason reason
        ReportStatus status
    }

    ModerationCase {
        string id PK
        ReportTargetType targetType
        string targetId
        string authorId FK
        ModerationLabel label
        float confidence
        ModerationCaseStatus status
    }

    Appeal {
        string id PK
        string caseId FK UK
        string userId FK
        AppealStatus status
    }

    Hashtag {
        string id PK
        string tag UK
        HashtagStatus status
    }

    PostHashtag {
        string postId PK
        string hashtagId PK
    }
```

### Users & Auth

```mermaid
erDiagram
    User ||--o{ Session : has
    User ||--o{ Account : has
    User ||--o{ Follow : follows
    User ||--o{ Follow : followed_by
    User ||--o{ Friendship : requests
    User ||--o{ Friendship : receives

    User {
        string id PK
        string email UK
        string phone UK
        string username UK
        Role role
        UserStatus status
        datetime lastSeenAt
    }

    Session {
        string id PK
        string token UK
        string userId FK
        datetime expiresAt
    }

    Account {
        string id PK
        string userId FK
        string providerId
        string accountId
    }

    Verification {
        string id PK
        string identifier
        string value
        datetime expiresAt
    }

    Follow {
        string followerId PK
        string followingId PK
    }

    Friendship {
        string id PK
        string requesterId FK
        string addresseeId FK
        FriendStatus status
    }
```

### Chat

```mermaid
erDiagram
    User ||--o{ ChatRoomMember : joins
    ChatRoom ||--o{ ChatRoomMember : has
    ChatRoom ||--o{ ChatMessage : contains
    User ||--o{ ChatMessage : sends
    ChatMessage ||--o{ ChatMessage : replies_to
    ChatMessage ||--o{ MessageReaction : has
    User ||--o{ MessageReaction : reacts
    Media ||--o{ ChatMessage : attached

    ChatRoom {
        string id PK
        RoomType type
        string name
        string createdById FK
    }

    ChatRoomMember {
        string roomId PK
        string userId PK
        datetime lastReadAt
    }

    ChatMessage {
        string id PK
        string roomId FK
        string senderId FK
        string type
        string content
        string mediaId FK
        string replyToId FK
        boolean isUnsent
    }

    MessageReaction {
        string id PK
        string messageId FK
        string userId FK
        string emoji
    }
```

### Posts & Media

```mermaid
erDiagram
    User ||--o{ Post : authors
    Post ||--o{ Post : replies
    Post ||--o{ PostLike : liked_by
    Post ||--o{ PostSave : saved_by
    Post ||--o{ PostShare : shared_by
    Post ||--o| PostEmbedding : has
    Post ||--o{ Media : contains
    User ||--o{ Media : owns
    User ||--o{ Notification : receives
    User ||--o{ Notification : acts

    Post {
        string id PK
        string authorId FK
        string content
        string parentId FK
        PostVisibility visibility
        datetime deletedAt
        datetime hiddenAt
    }

    PostLike {
        string userId PK
        string postId PK
        string type
    }

    PostSave {
        string userId PK
        string postId PK
    }

    PostShare {
        string id PK
        string userId FK
        string postId FK
    }

    PostEmbedding {
        string postId PK
        vector embedding
    }

    Media {
        string id PK
        string ownerId FK
        string postId FK
        MediaKind kind
        MediaStatus status
        string storagePath
        string publicUrl
    }

    Notification {
        string id PK
        string recipientId FK
        string actorId FK
        NotificationType type
        datetime readAt
    }
```

### Enum chính

| Enum | Giá trị |
|---|---|
| `Role` | `USER`, `MODERATOR`, `ADMIN`, `SUPER_ADMIN` |
| `UserStatus` | `ACTIVE`, `LOCKED`, `BANNED` |
| `PostVisibility` | `PUBLIC`, `FRIENDS`, `PRIVATE` |
| `ReportTargetType` | `POST`, `USER`, `COMMENT` |
| `ReportReason` | `SPAM`, `BULLYING`, `MINOR_SAFETY`, `SELF_HARM`, `VIOLENCE`, … |
| `ReportStatus` | `PENDING`, `UNDER_REVIEW`, `RESOLVED`, `DISMISSED`, `AUTO_HIDDEN` |
| `ModerationLabel` | `TOXIC`, `SPAM`, `HARASSMENT`, `HATE`, `SEXUAL`, `VIOLENCE`, … |
| `ModerationCaseStatus` | `PENDING`, `AUTO_HIDDEN`, `RESOLVED_KEPT`, `RESOLVED_REMOVED`, `DISMISSED` |
| `AppealStatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `HashtagStatus` | `ACTIVE`, `HIDDEN`, `BLOCKED` |
| `FriendStatus` | `PENDING`, `ACCEPTED`, `REJECTED` |
| `RoomType` | `DIRECT`, `GROUP` |
| `MediaStatus` | `PENDING`, `PROCESSING`, `READY`, `FAILED` |
| `MediaKind` | `IMAGE`, `VIDEO`, `AVATAR` |
| `NotificationType` | `POST_LIKED`, `POST_REPLIED`, `USER_FOLLOWED`, `FRIEND_REQUEST`, `MESSAGE_RECEIVED`, … |

## Realtime & Workers

### Socket.io namespaces

| Namespace | Mục đích | Sự kiện tiêu biểu |
|---|---|---|
| `/chat` | Tin nhắn 1-1 & nhóm | `message:new`, `message:reaction`, `room:created`, presence |
| `/feed` | Cập nhật feed realtime | `post:reacted`, `post:updated`, `post:deleted` |
| `/notifications` | Thông báo push | `notification:new` |

Client lấy token handshake qua `POST /api/v1/chat/socket-token` trước khi connect.

Nguồn: [`apps/server/src/socket/socket.ts`](../apps/server/src/socket/socket.ts)

### BullMQ workers

| Queue | Mục đích |
|---|---|
| `Media` | Skeleton (noop) — dự phòng xử lý media nền |
| `Email` | Skeleton (noop) — dự phòng gửi email qua Nodemailer |
| `Notification` | Skeleton (noop) — dự phòng thông báo nền |
| `MediaCleanup` | Dọn file chat hết hạn trên đĩa VPS |
| `TrendingHashtags` | Tính hashtag trending |
| `ContentModeration` | AI kiểm duyệt nội dung bài viết (Vercel AI Gateway + gpt-4o-mini) |
| `Embedding` | Sinh vector embedding cho hybrid search (OpenAI text-embedding-3-small) |

Nguồn: [`apps/server/src/workers/index.ts`](../apps/server/src/workers/index.ts)

## Error envelope

Mọi API response tuân theo envelope thống nhất từ `@costy/shared`:

**Thành công:**

```json
{
  "success": true,
  "data": { ... },
  "meta": { "nextCursor": "...", "total": 42 }
}
```

**Lỗi:**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Không tìm thấy bài viết"
  }
}
```

## Danh sách API endpoints

Base URL phía browser: `/api/v1/*` (qua Next BFF). Base URL upstream Express: `http://localhost:4000/api/v1/*`.

Swagger UI (dev): <http://localhost:4000/docs>

### Health

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/api/v1/health` | Không | Liveness + kiểm tra Postgres & Redis |

### Auth (ngoài `/api/v1`)

| Method | Path | Mô tả |
|---|---|---|
| `POST` | `/api/auth/sign-in/identifier` | Đăng nhập bằng email/username + password |
| `*` | `/api/auth/*` | BetterAuth web (sign-up, OAuth, get-session, sign-out…) |
| `*` | `/api/admin/auth/*` | BetterAuth admin (cookie namespace riêng) |

### Posts — `/api/v1/posts`

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/posts/reels` | Tùy chọn | Feed reels (video), phân trang cursor |
| `GET` | `/posts` | Tùy chọn | Home feed (bài gốc) |
| `POST` | `/posts` | Có | Tạo bài viết (multipart, kèm media) |
| `GET` | `/posts/:postId` | Tùy chọn | Chi tiết bài viết |
| `GET` | `/posts/:postId/root` | Không | Lấy ID bài gốc (đệ quy reply) |
| `GET` | `/posts/:postId/comments` | Tùy chọn | Danh sách comment |
| `PUT` | `/posts/:postId` | Có | Sửa nội dung / visibility |
| `DELETE` | `/posts/:postId` | Có | Xóa bài viết / comment |
| `PUT` | `/posts/:postId/reactions` | Có | Bày tỏ cảm xúc (like, love, haha…) |
| `POST` | `/posts/:postId/save` | Có | Lưu bài viết |
| `DELETE` | `/posts/:postId/save` | Có | Bỏ lưu |
| `POST` | `/posts/:postId/share` | Có | Chia sẻ (đếm lượt) |

### Users — `/api/v1/users`

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/users` | Có | Gợi ý user (picker/composer) |
| `GET` | `/users/:username` | Tùy chọn | Profile công khai |
| `GET` | `/users/:username/feed` | Tùy chọn | Feed trang cá nhân |
| `GET` | `/users/:username/posts` | Tùy chọn | Grid bài viết (ảnh/video) |
| `GET` | `/users/:username/likes` | Tùy chọn | Bài đã thích (chủ tài khoản) |
| `GET` | `/users/:username/followers` | Tùy chọn | Danh sách follower |
| `GET` | `/users/:username/following` | Tùy chọn | Danh sách đang follow |
| `POST` | `/users/:id/follow` | Có | Follow user |
| `DELETE` | `/users/:id/follow` | Có | Unfollow user |

### Friends — `/api/v1/friends`

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/friends` | Có | Danh sách bạn bè |
| `GET` | `/friends/requests` | Có | Lời mời đến / đã gửi (`?type=incoming\|outgoing`) |
| `POST` | `/friends/:userId/request` | Có | Gửi lời mời kết bạn |
| `DELETE` | `/friends/:userId/request` | Có | Hủy lời mời đã gửi |
| `POST` | `/friends/:userId/accept` | Có | Chấp nhận lời mời |
| `POST` | `/friends/:userId/reject` | Có | Từ chối lời mời |
| `DELETE` | `/friends/:userId` | Có | Hủy kết bạn |

### Chat — `/api/v1/chat`

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `POST` | `/chat/socket-token` | Có | Token handshake Socket.io `/chat` |
| `GET` | `/chat/conversations` | Có | Danh sách hội thoại |
| `POST` | `/chat/rooms` | Có | Tạo phòng 1-1 hoặc nhóm |
| `GET` | `/chat/rooms/:roomId/messages` | Có | Lịch sử tin nhắn |
| `POST` | `/chat/rooms/:roomId/read` | Có | Đánh dấu đã đọc |

### Search — `/api/v1/search`

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/search` | Không | Hybrid search bài viết (FTS + semantic RRF) |
| `GET` | `/search/users` | Tùy chọn | Tìm user theo tên/username |
| `GET` | `/search/hashtags` | Không | Tìm hashtag |

### Notifications — `/api/v1/notifications`

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/notifications` | Có | Danh sách thông báo (cursor) |
| `GET` | `/notifications/unread-count` | Có | Số thông báo chưa đọc |
| `POST` | `/notifications/read` | Có | Đánh dấu đã đọc (1 hoặc tất cả) |

### Me — `/api/v1/me`

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `PATCH` | `/me/profile` | Có | Cập nhật tên / bio |
| `POST` | `/me/avatar` | Có | Upload avatar (multipart → Cloudinary) |
| `POST` | `/me/cover` | Có | Upload ảnh bìa |
| `GET` | `/me/saved` | Có | Bài viết đã lưu |
| `GET` | `/me/moderation/cases/:id` | Có | Chi tiết case kiểm duyệt của mình |
| `POST` | `/me/moderation/cases/:id/appeal` | Có | Gửi kháng nghị |

### Reports — `/api/v1/reports`

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `POST` | `/reports` | Có | Gửi báo cáo vi phạm |

### Media — `/api/v1/media`

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `POST` | `/media/upload` | Có | Upload media chat (lưu local VPS) |

Static serve: `GET /api/v1/media/uploads/*` — phục vụ file đã upload.

### Admin — `/api/v1/admin`

Yêu cầu auth admin + permission tương ứng.

| Method | Path | Permission | Mô tả |
|---|---|---|---|
| `GET` | `/admin/me/permissions` | Panel access | Quyền của admin hiện tại |
| `GET` | `/admin/stats/overview` | `stats:view` | Tổng quan thống kê |
| `GET` | `/admin/stats/posts-per-day` | `stats:view` | Bài viết theo ngày |
| `GET` | `/admin/stats/active-users` | `stats:view` | User hoạt động theo ngày |
| `GET` | `/admin/stats/top-hashtags` | `stats:view` | Hashtag trending |
| `GET` | `/admin/users` | `user:read` | Danh sách user |
| `GET` | `/admin/users/:id` | `user:read` | Chi tiết user |
| `PATCH` | `/admin/users/:id/status` | `user:lock` | Khóa / ban user |
| `GET` | `/admin/reports` | `report:read` | Danh sách báo cáo |
| `GET` | `/admin/reports/:id` | `report:read` | Chi tiết báo cáo |
| `PATCH` | `/admin/reports/:id` | `report:review` | Cập nhật trạng thái báo cáo |
| `PATCH` | `/admin/reports/:id/action` | `report:review` | Thực thi hành động kiểm duyệt |
| `GET` | `/admin/moderation/cases` | `report:read` | Danh sách case AI |
| `GET` | `/admin/moderation/cases/:id` | `report:read` | Chi tiết case |
| `PATCH` | `/admin/moderation/cases/:id/action` | `report:review` | Xử lý case |
| `PATCH` | `/admin/moderation/cases/:id/appeal` | `report:review` | Duyệt kháng nghị |
| `GET` | `/admin/hashtags` | `hashtag:read` | Danh sách hashtag |
| `PATCH` | `/admin/hashtags/:id` | `hashtag:manage` | Ẩn / chặn hashtag |
| `GET` | `/admin/moderators` | `moderator:manage` | Danh sách moderator |
| `POST` | `/admin/moderators` | `moderator:manage` | Thăng cấp moderator |
| `GET` | `/admin/permissions` | `permission:grant` | Danh sách permission |
| `GET` | `/admin/users/:id/permissions` | `permission:grant` | Permission của user |
| `PUT` | `/admin/users/:id/permissions` | `permission:grant` | Gán / thu hồi permission |
| `GET` | `/admin/audit-logs` | `audit:read` | Nhật ký hành động admin |
