---
name: create-admin-list
description: >-
  Tạo hoặc refactor trang admin dạng danh sách (table desktop + card mobile).
  Dùng khi thêm module Users/Reports/Hashtags/Moderators hoặc sửa *-table.tsx,
  *-card-list.tsx, admin-table.ts.
---

# Skill: Create Admin List (table + card)

## Trước khi code

1. Đọc `.cursor/rules/admin-table-layout.mdc` — căn giữa `th`/`td`, `adminCol`, cấm `min-w` cứng.
2. Đọc `.cursor/rules/admin-responsive-lists.mdc` — breakpoint `lg`, cấu trúc file, card grid.
3. Tham chiếu implementation: `apps/admin/components/admin/users/`, `reports/`.

## Cấu trúc file (bắt buộc)

```
apps/admin/components/admin/<feature>/
  <feature>-table.tsx           # adminTable.wrap, hidden lg:block
  <feature>-card-list.tsx       # lg:hidden
  <feature>-table-skeleton.tsx
  <feature>-card-skeleton.tsx
apps/admin/app/(dashboard)/<feature>/page.tsx   # chỉ fetch, filter, pagination
```

Không viết `<table>` inline trong `page.tsx`. Không dùng `TableSkeleton` generic.

## Table desktop — từng bước

1. Khai báo cột đầu file:

```tsx
const colMain = adminCol('grow', 'start');      // nhiều dòng → stackCenter
const colMeta = adminCol('grow', 'center');     // badge, số, text
const colActions = adminCol('actions', 'end');  // actionsGroup
```

2. `<table className={adminTable.table}>` — không `min-w-[Npx]`.
3. Mỗi cột: `<th className={col*.th}>` + `<td className={col*.td}><div className={col*.cell}>…</div></td>`.
4. Cấm trên `th`/`td`: `text-left`, `text-right`, `justify-end`, `items-start`, `ml-auto`.
5. Badge: `inline-flex shrink-0 whitespace-nowrap` trong `col*.cell`.
6. Nút: `adminTable.actionBtn` trong `colActions.cell` (`actionsGroup`).
7. Label cột: `t('…')` — không hardcode EN/VI.

## Card mobile/tablet

- `space-y-3 lg:hidden`, card `rounded-xl border bg-card p-4`.
- Meta: `grid grid-cols-[1fr_auto]` — không `flex justify-between flex-wrap`.
- Action: `h-9 w-full`.

## Skeleton

- Cùng `adminCol` constants như table.
- Placeholder căn giữa: `mx-auto`, không `ml-auto`.

## Checklist xong

- [ ] 1024px+: table visible, mọi cột căn giữa (header ↔ body thẳng cột).
- [ ] 768px: card visible, table hidden.
- [ ] Skeleton + loaded cùng cột / `hidden xl:`.
- [ ] `cd apps/admin && npx tsc --noEmit` pass.
