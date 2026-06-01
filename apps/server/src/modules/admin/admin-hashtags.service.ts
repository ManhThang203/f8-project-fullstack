import { prisma } from '@costy/db';
import type { AdminHashtagDto } from '@costy/shared';

import { writeAuditLog } from '../../lib/admin/audit.service.js';
import { AppError } from '../../lib/errors.js';
import { invalidateStatsCache } from './admin-stats.service.js';

function rangeToDate(range: string): Date {
  const ms =
    range === '24h'
      ? 24 * 60 * 60 * 1000
      : range === '30d'
        ? 30 * 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ms);
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

  const hashtags = await prisma.hashtag.findMany({
    where: {
      ...(query.q ? { tag: { contains: query.q, mode: 'insensitive' } } : {}),
      ...(query.cursor ? { id: { lt: query.cursor } } : {}),
    },
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    take,
  });

  const items: AdminHashtagDto[] = await Promise.all(
    hashtags.map(async (h) => {
      const postCount = await prisma.postHashtag.count({
        where: { hashtagId: h.id, post: { createdAt: { gte: from }, deletedAt: null } },
      });
      return {
        id: h.id,
        tag: h.tag,
        status: h.status as AdminHashtagDto['status'],
        featured: h.featured,
        postCount,
        growthPct: 0,
        createdAt: h.createdAt.toISOString(),
      };
    }),
  );

  items.sort((a, b) => b.postCount - a.postCount);

  const hasMore = items.length > query.limit;
  const page = hasMore ? items.slice(0, query.limit) : items;
  const nextCursor = hasMore && page.length ? page[page.length - 1]!.id : null;
  return { items: page, nextCursor };
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
