# Profile Screen — Design Spec

> **Status:** Design spec (UI/UX handoff to Dev)  
> **App:** Cotsy (Threads/Instagram hybrid)  
> **Routes:** `/[username]` — own profile & other user's profile  
> **Schema:** [`packages/db/prisma/schema.prisma`](../../packages/db/prisma/schema.prisma)

---

## 1. Phạm vi (Scope)

### In-scope

| Area | Mô tả |
|---|---|
| Own profile | `/[username]` khi `isOwner = true` |
| Other profile | `/[username]` khi `isOwner = false` |
| Header | Avatar, tên, handle, bio, 3 chỉ số, action buttons |
| Tabs | **Bài viết** (grid ảnh) · **Reels** (grid video) · **Đã thích** (own only) |
| Modals | Danh sách Followers / Following, lightbox avatar, lightbox post |
| States | Loading, empty, error, 404, deleted account |

### Out-of-scope

- Ảnh cover (không có trường `coverImage` trên `User`)
- Tab Tagged (không có schema mentions)
- Chỉnh sửa profile (plan riêng)
- Implement code trong spec này — spec chỉ mô tả thiết kế

---

## 2. Tham chiếu Instagram

Phân tích pattern Instagram Profile áp dụng cho Cotsy:

| Pattern IG | Áp dụng Cotsy |
|---|---|
| Không cover (mobile-first) | Bỏ cover — avatar + info nằm trên cùng |
| Avatar tròn + stats hàng ngang | Avatar 2xl + 3 chỉ số clickable |
| Grid 3 cột, gap mảnh | `gap-px` mobile, `gap-1` desktop |
| Tab Posts / Reels / (Saved/Liked) | Tab Bài viết / Reels / Đã thích (own) |
| Follow / Message trên profile người khác | Theo dõi + Nhắn tin |
| Edit profile trên profile của mình | Chỉnh sửa trang cá nhân |

Khác biệt so với IG: dùng design tokens Cotsy (dark-native, Geist, spacing 4px scale) theo [`layout.md`](../layout.md) và [`philosophy.md`](../philosophy.md).

---

## 3. Mapping dữ liệu (DB → UI)

### Bảng mapping

| Nguồn DB | UI field | Ghi chú |
|---|---|---|
| `User.image` | Avatar | Size `2xl` (96px desktop, 88px mobile). Xem [`avatar.md`](../components/avatar.md) |
| `User.name` | Display name | `text-heading-2`, semibold |
| `User.username` | Handle | `@username`, `text-body-sm`, muted |
| `User.bio` | Bio | `text-body`, line-clamp 4 mobile / full desktop |
| `User.createdAt` | Meta | "Tham gia tháng MM/YYYY", `text-caption`, muted |
| `count(Post)` where `authorId = user.id`, `deletedAt IS NULL`, `parentId IS NULL` | **Bài viết** | Chỉ đếm bài gốc, không đếm reply |
| `count(Follow)` where `followingId = user.id` | **Người theo dõi** | Ai đang follow user này |
| `count(Follow)` where `followerId = user.id` | **Đang theo dõi** | User này đang follow ai |
| `Post` ⋈ `Media` where `kind = IMAGE`, `status = READY` | Grid Bài viết | Thumbnail = media đầu tiên (`orderBy createdAt asc`, `take 1`) |
| `Post` ⋈ `Media` where `kind = VIDEO`, `status = READY` | Grid Reels | Thumbnail = frame đầu + icon play overlay |
| `PostLike` where `userId = viewer.id` | Tab Đã thích | Chỉ hiển thị khi `isOwner = true` |

### Quan hệ Follow (tham chiếu)

```
Follow.followerId  → User.id   (người đi follow)
Follow.followingId → User.id   (người được follow)
```

- **Người theo dõi** = đếm rows có `followingId = profileUser.id`
- **Đang theo dõi** = đếm rows có `followerId = profileUser.id`

### Post ⋈ Media (không tạo bảng mới)

Join chỉ xảy ra lúc query — ghép `posts` + `media` qua `Media.postId → Post.id`:

```typescript
// Prisma minh họa
prisma.post.findMany({
  where: {
    authorId: userId,
    deletedAt: null,
    parentId: null,
    media: { some: { kind: 'IMAGE', status: 'READY' } },
  },
  include: {
    media: {
      where: { kind: 'IMAGE', status: 'READY' },
      orderBy: { createdAt: 'asc' },
      take: 1,
    },
  },
  orderBy: { createdAt: 'desc' },
});
```

---

## 4. Layout

Tuân theo [`layout.md`](../layout.md) — main column max **600px** (cùng feed width), single column mobile.

### Wireframe — Desktop (≥768px)

```
+------------------------------------------------+
|  SiteHeader (sticky, z-50)                     |
+------------------------------------------------+
|                                                |
|  [Avatar 96]   name (h2)         [Action btns] |
|                @username                       |
|                bio                             |
|                Tham gia MM/YYYY                |
|                                                |
|  [12 Bài viết]  [340 Người theo dõi]  [180 Đang theo dõi]
|                                                |
|  +----------+----------+----------+            |
|  | Bài viết |  Reels   | Đã thích |  (sticky)  |
|  +----------+----------+----------+            |
|                                                |
|  +----+----+----+                              |
|  | □  | □  | □  |  Grid 3 col, gap-1 (4px)    |
|  +----+----+----+  aspect-square 1:1           |
|  | □  | □  | □  |                              |
|  +----+----+----+                              |
|                                                |
+------------------------------------------------+
        max-width: 600px, mx-auto
```

### Wireframe — Mobile (<768px)

```
+---------------------------+
| SiteHeader (sticky)       |
+---------------------------+
| [Avatar 88]               |
| name                      |
| @username                 |
| bio (max 4 lines)         |
| joined MM/YYYY            |
|                           |
| 12    340       180       |
| Bài   Người     Đang      |
| viết  theo dõi  theo dõi  |
|                           |
| [Chỉnh sửa] [Kho lưu trữ] |
+---------------------------+
| Bài viết | Reels | Thích  |  sticky top-14
+---------------------------+
| □ | □ | □ |  gap-px, full-bleed
| □ | □ | □ |
| □ | □ | □ |
+---------------------------+
```

### Spacing & typography

| Token | Giá trị | Vị trí |
|---|---|---|
| `py-8` | 32px | Profile header padding desktop |
| `gap-8` | 32px | Avatar ↔ info block desktop |
| `gap-2` / `gap-3` | 8px / 12px | Stats, action buttons |
| `gap-px` | 1px | Grid mobile |
| `gap-1` | 4px | Grid desktop |
| `top-14` | 56px | Sticky tabs offset (SiteHeader height) |

Typography: [`typography.md`](../typography.md) — max 2 weights per view.

---

## 5. Own vs Other

### Profile cá nhân (`isOwner = true`)

**Actions:**

| Control | Variant | Hành vi |
|---|---|---|
| Chỉnh sửa trang cá nhân | secondary outline | Navigate tới edit profile (future) |
| Xem kho lưu trữ | secondary outline | Navigate tới archive (future) |
| Settings | icon-md ghost | Mở menu cài đặt |

**Tabs:** Bài viết · Reels · **Đã thích** (tab 3 chỉ own thấy)

### Profile người khác (`isOwner = false`)

**Actions — chưa follow (`isFollowing = false`):**

| Control | Variant |
|---|---|
| Theo dõi | primary (filled) |
| Nhắn tin | secondary outline → mở chat dock |

**Actions — đã follow (`isFollowing = true`):**

| Control | Variant |
|---|---|
| Đang theo dõi ▾ | secondary outline + dropdown |
| Nhắn tin | secondary outline |

**Dropdown "Đang theo dõi":** Hủy theo dõi · Hạn chế · Chặn (Hạn chế/Chặn = future)

**Tabs:** Bài viết · Reels (không có tab Đã thích)

---

## 6. Component breakdown

Đặt tại `apps/web/modules/profile/components/`:

| Component | Trách nhiệm |
|---|---|
| `ProfileHeader` | Avatar + tên + handle + bio + joined date |
| `ProfileStats` | 3 ô số liệu, clickable |
| `ProfileActions` | Render theo `isOwner` / `isFollowing` |
| `ProfileTabs` | Sticky tab strip, sync `?tab=` |
| `ProfileMediaGrid` | Grid 3-col, infinite scroll |
| `ProfileMediaTile` | 1 thumbnail, badge multi-media / play icon |
| `FollowListModal` | Danh sách followers/following + search |
| `MediaLightbox` | Xem post detail read-only |

**Reuse:**

- [`SiteHeader`](../../apps/web/components/layout/site-header.tsx)
- Avatar spec: [`avatar.md`](../components/avatar.md)
- Button spec: [`button.md`](../components/button.md)
- Modal spec: [`modal.md`](../components/modal.md)

---

## 7. States

| State | Trigger | Hiển thị |
|---|---|---|
| Loading profile | Initial navigation | Skeleton: avatar tròn + 2 text lines + 3 stat blocks + 9 grid cells. Xem [`loading.md`](../loading.md) |
| User không tồn tại | `GET /users/:username` → 404 | "Không tìm thấy người dùng này" + link Trang chủ |
| User đã xóa | `User.deletedAt != null` | "Tài khoản này không khả dụng" — ẩn posts, ẩn follow actions |
| Profile riêng tư (future) | `isPrivate && !isFollowing` | Header visible, grid: "Tài khoản riêng tư — theo dõi để xem" |
| Empty posts (own) | Grid count = 0 | "Chia sẻ bài viết đầu tiên của bạn" + **Tạo bài viết** |
| Empty posts (other) | Grid count = 0 | "Người này chưa có bài viết." |
| Empty reels | Reels count = 0 | "Chưa có Reels." |
| Loading more | IntersectionObserver trigger | Spinner cuối grid, batch 12 |
| Network error | Fetch fail | Inline alert + nút **Thử lại** |
| Follow action loading | POST/DELETE follow | Button loading state, disable double-tap |

---

## 8. Tương tác (Interactions)

| Hành động | Kết quả |
|---|---|
| Click avatar | Full-screen lightbox xem avatar |
| Click **Người theo dõi** | Mở modal/route followers (paginated) |
| Click **Đang theo dõi** | Mở modal/route following (paginated) |
| Click grid tile | Mở `MediaLightbox` — post detail read-only |
| Theo dõi / Hủy theo dõi | Optimistic UI → revert + toast nếu fail |
| Đổi tab | URL `?tab=posts\|reels\|liked` — giữ state khi refresh |
| Scroll grid | Infinite scroll, IntersectionObserver, batch 12 |
| Hover tile (desktop) | Overlay: lượt thích + số phản hồi |

### Tab URL sync

| URL | Tab active | Ghi chú |
|---|---|---|
| `/minh` | posts | Default |
| `/minh?tab=reels` | reels | |
| `/minh?tab=liked` | liked | Chỉ own; redirect về posts nếu other |

---

## 9. Accessibility

Theo [`accessibility.md`](../accessibility.md):

- Touch target ≥ **44×44px** trên mọi control
- Tabs: `role="tablist"`, `role="tab"`, `aria-selected`, arrow-key navigation
- Grid tile: `aria-label="Bài viết của @username, {n} lượt thích, {m} phản hồi"`
- Stats: `aria-label="340 người theo dõi"` — không chỉ hiện số
- Modal: focus trap, đóng bằng Esc, `aria-modal="true"`
- Avatar lightbox: `alt` mô tả hoặc `aria-label="Ảnh đại diện của {name}"`
- `prefers-reduced-motion`: tắt hover scale trên grid tiles

---

## 10. Endpoint BE (handoff Dev Backend)

Hiện tại chỉ có `GET /users` (picker). Cần bổ sung:

### `GET /users/:username`

Profile header + counts + relationship flags.

**Response (minh họa):**

```json
{
  "id": "cuid",
  "username": "minh",
  "name": "Minh Nguyễn",
  "bio": "...",
  "image": "https://...",
  "createdAt": "2025-01-15T...",
  "counts": {
    "posts": 12,
    "followers": 340,
    "following": 180
  },
  "isOwner": false,
  "isFollowing": true
}
```

**Errors:** 404 user not found · 410 deleted user (optional)

### `GET /users/:username/posts`

Query: `cursor`, `limit` (default 12), `kind=image|video`

**Response:** `{ items: PostWithThumbnail[], nextCursor: string | null }`

Mỗi item gồm: `postId`, `thumbnailUrl`, `mediaCount`, `likeCount`, `replyCount`, `createdAt`

### `GET /users/:username/likes`

Own only (`isOwner`). Paginated. Same shape as posts grid.

**Errors:** 403 nếu viewer không phải owner

### `GET /users/:username/followers`

Query: `cursor`, `limit` (default 20)

**Response:** `{ items: UserSummary[], nextCursor }` — `id`, `username`, `name`, `image`, `isFollowing` (viewer context)

### `GET /users/:username/following`

Same shape as followers.

### `POST /users/:id/follow`

Auth required. Idempotent. Tạo row `Follow`. Trả `{ isFollowing: true }`.

### `DELETE /users/:id/follow`

Auth required. Xóa row `Follow`. Trả `{ isFollowing: false }`.

**Side effects:** Tạo `Notification` type `USER_FOLLOWED` (đã có enum trong schema).

---

## 11. URL & Routing (handoff Dev Frontend)

### File structure

```
apps/web/app/(site)/[username]/
  page.tsx              ← profile chính
  loading.tsx           ← skeleton ([loading.md](../loading.md))
  not-found.tsx         ← user không tồn tại
  followers/
    page.tsx            ← trang full followers (deep link)
  following/
    page.tsx            ← trang full following (deep link)
  @modal/
    (.)followers/
      page.tsx          ← modal khi soft navigate từ profile
    (.)following/
      page.tsx          ← modal khi soft navigate từ profile
  layout.tsx            ← optional: parallel route slot @modal
```

### Intercepting routes

| Navigation | Hiển thị |
|---|---|
| Từ profile, click stats → `/minh/followers` | Modal overlay, profile vẫn phía sau |
| Paste `/minh/followers` hoặc F5 | Trang full danh sách |
| Browser Back từ modal | Đóng modal, vẫn ở `/minh` |

---

## 12. Acceptance criteria

### Header & stats

- [ ] Avatar hiển thị từ `User.image`; fallback initials nếu null
- [ ] Display name, handle, bio, joined date map đúng DB
- [ ] 3 chỉ số đếm đúng theo query spec (posts / followers / following)
- [ ] Stats clickable mở followers/following list

### Own vs Other

- [ ] Own: hiện "Chỉnh sửa", "Kho lưu trữ", Settings; tab "Đã thích" visible
- [ ] Other: hiện Theo dõi/Nhắn tin; không có tab "Đã thích"
- [ ] Follow button optimistic + toast on error
- [ ] `isFollowing` state sync sau follow/unfollow

### Tabs & grid

- [ ] Tab mặc định = Bài viết (`?tab=posts` hoặc no query)
- [ ] `?tab=reels` và `?tab=liked` persist qua refresh
- [ ] Grid 3 cột, aspect-square 1:1, gap đúng breakpoint
- [ ] Chỉ hiện post có media READY (IMAGE cho posts, VIDEO cho reels)
- [ ] Multi-media post hiện badge carousel icon
- [ ] Infinite scroll batch 12, spinner cuối grid

### Modals & lightbox

- [ ] Click tile mở post detail read-only
- [ ] Followers/following modal: search, paginate, inline follow button
- [ ] Modal focus trap + Esc close
- [ ] Deep link `/username/followers` render full page (không modal)

### States & errors

- [ ] Skeleton on initial load (`loading.tsx`)
- [ ] 404 page cho username không tồn tại
- [ ] Deleted user message, ẩn grid và follow
- [ ] Empty states đúng copy own vs other
- [ ] Network error + retry

### Accessibility & design system

- [ ] Touch targets ≥ 44×44px
- [ ] Tab keyboard navigation
- [ ] Grid tiles có descriptive `aria-label`
- [ ] Chỉ dùng design tokens (no hardcoded hex, no arbitrary spacing)
- [ ] Dark mode primary, light mode verified
- [ ] `prefers-reduced-motion` respected

### API integration

- [ ] Profile page không gọi hơn 2 request ban đầu (profile + tab content)
- [ ] Followers/following lazy-loaded on click
- [ ] Likes endpoint trả 403 cho non-owner

---

## 13. Open questions (future plans)

| Item | Ghi chú |
|---|---|
| Edit profile flow | Plan riêng — form avatar, name, bio |
| Archive / Saved posts | Cần schema hoặc flag trên Post |
| Private account | Cần field `isPrivate` trên User |
| Block / Restrict | Cần bảng Block hoặc Restrict |
| Verified badge | Cần field `isVerified` trên User |

---

## 14. Related docs

- [`layout.md`](../layout.md)
- [`responsive.md`](../responsive.md)
- [`media.md`](../media.md)
- [`motion.md`](../motion.md)
- [`components/post-card.md`](../components/post-card.md)
