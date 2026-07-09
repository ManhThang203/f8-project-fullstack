import { prisma, type Prisma } from '@costy/db';
import type { AdminHashtagDto } from '@costy/shared';

import { writeAuditLog } from '../../lib/admin/audit.service.js';
import { AppError } from '../../lib/errors.js';

import { invalidateStatsCache } from './admin-stats.service.js';

// Chuyển đổi khoảng thời gian thành ngày
function rangeToDate(range: string): Date {
  const ms =
    range === '24h'
      ? 24 * 60 * 60 * 1000
      : range === '30d'
        ? 30 * 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ms);
}

type HashtagCursor = { featured: boolean; createdAt: Date; id: string };

/** Mã hoá cursor hashtag theo đúng thứ tự featured desc, createdAt desc, id desc. */
function encodeHashtagCursor(row: HashtagCursor): string {
  const raw = `${row.featured ? '1' : '0'}|${row.createdAt.toISOString()}|${row.id}`;
  return Buffer.from(raw, 'utf8').toString('base64');
}

/** Giải mã cursor hashtag; bỏ qua cursor rỗng/hỏng để không làm vỡ phân trang. */
function decodeHashtagCursor(cursor?: string): HashtagCursor | undefined {
  if (!cursor) return undefined;
  let raw: string;
  try {
    raw = Buffer.from(cursor, 'base64').toString('utf8');
  } catch {
    return undefined;
  }
  const [featuredRaw, iso, id] = raw.split('|');
  if ((featuredRaw !== '0' && featuredRaw !== '1') || !iso || !id) return undefined;
  const createdAt = new Date(iso);
  if (Number.isNaN(createdAt.getTime())) return undefined;
  return { featured: featuredRaw === '1', createdAt, id };
}

/** Mảnh where lọc trang sau cho sort featured desc, createdAt desc, id desc. */
function hashtagCursorWhere(cursor?: string): Prisma.HashtagWhereInput | undefined {
  const c = decodeHashtagCursor(cursor);
  if (!c) return undefined;
  return {
    OR: [
      ...(c.featured ? [{ featured: false }] : []),
      { featured: c.featured, createdAt: { lt: c.createdAt } },
      { featured: c.featured, createdAt: c.createdAt, id: { lt: c.id } },
    ],
  };
}

/** Danh sách hashtag trending cho admin. */
export async function listAdminHashtags(query: {
  range: string;
  q?: string;
  cursor?: string;
  limit: number;
}): Promise<{ items: AdminHashtagDto[]; nextCursor: string | null }> {
  const from = rangeToDate(query.range);
  const take = query.limit + 1;
  const and: Prisma.HashtagWhereInput[] = [
    ...(query.q ? [{ tag: { contains: query.q, mode: 'insensitive' as const } }] : []),
  ];
  const cursorWhere = hashtagCursorWhere(query.cursor);
  if (cursorWhere) and.push(cursorWhere);

  const hashtags = await prisma.hashtag.findMany({
    where: and.length ? { AND: and } : undefined,
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    take,
  });

  const hasMore = hashtags.length > query.limit;
  const pageRows = hasMore ? hashtags.slice(0, query.limit) : hashtags;
  const lastRaw = hasMore ? hashtags[query.limit - 1] : null;
  const nextCursor = lastRaw ? encodeHashtagCursor(lastRaw) : null;

  // Batch: đếm postCount cho tất cả hashtag trong 1 query (groupBy) thay vì mỗi hashtag 1 count
  const hashtagIds = pageRows.map((h) => h.id);
  const countGroups = hashtagIds.length
    ? await prisma.postHashtag.groupBy({
        by: ['hashtagId'],
        where: {
          hashtagId: { in: hashtagIds },
          post: { createdAt: { gte: from }, deletedAt: null },
        },
        _count: { _all: true },
      })
    : [];
  const countMap = new Map(countGroups.map((g) => [g.hashtagId, g._count._all]));

  const items: AdminHashtagDto[] = pageRows.map((h) => ({
    id: h.id,
    tag: h.tag,
    status: h.status as AdminHashtagDto['status'],
    featured: h.featured,
    postCount: countMap.get(h.id) ?? 0,
    growthPct: 0,
    createdAt: h.createdAt.toISOString(),
  }));

  // Không re-sort theo postCount trong bộ nhớ: cursor phân trang dựa trên thứ tự
  // featured/createdAt của DB, re-sort chỉ trong 1 trang sẽ làm thứ tự hiển thị lệch cursor.
  return { items, nextCursor };
}

/** Cập nhật trạng thái hashtag: feature/hide/block. */
export async function patchAdminHashtag(
  actorId: string,
  hashtagId: string,
  action: 'feature' | 'unfeature' | 'hide' | 'block' | 'activate',
): Promise<AdminHashtagDto> {
  const hashtag = await prisma.hashtag.findUnique({ where: { id: hashtagId } });
  if (!hashtag) throw AppError.notFound('Không tìm thấy hashtag');

  let status = hashtag.status;
  let featured = hashtag.featured;

  switch (action) {
    case 'feature':
      featured = true;
      status = 'ACTIVE';
      break;
    case 'unfeature':
      featured = false;
      break;
    case 'hide':
      status = 'HIDDEN';
      featured = false;
      break;
    case 'block':
      status = 'BLOCKED';
      featured = false;
      break;
    case 'activate':
      status = 'ACTIVE';
      break;
  }

  const updated = await prisma.hashtag.update({
    where: { id: hashtagId },
    data: { status, featured },
  });

  await invalidateStatsCache();

  await writeAuditLog({
    actorId,
    action: `HASHTAG_${action.toUpperCase()}`,
    targetType: 'HASHTAG',
    targetId: hashtagId,
    metadata: { status, featured },
  });

  const postCount = await prisma.postHashtag.count({ where: { hashtagId } });
  return {
    id: updated.id,
    tag: updated.tag,
    status: updated.status as AdminHashtagDto['status'],
    featured: updated.featured,
    postCount,
    growthPct: 0,
    createdAt: updated.createdAt.toISOString(),
  };
}
