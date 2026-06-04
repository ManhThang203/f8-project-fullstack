import { prisma } from '@costy/db';
import type {
  AdminActiveUsersDto,
  AdminPostsPerDayDto,
  AdminStatsMeta,
  AdminStatsOverviewDto,
  AdminTopHashtagDto,
} from '@costy/shared';

import { redis } from '../../lib/redis.js';

const STATS_TTL_SEC = 30;
const STATS_RANGES = ['24h', '7d', '30d', '90d'] as const;

function rangeToMs(range: string): number {
  switch (range) {
    case '24h':
      return 24 * 60 * 60 * 1000;
    case '7d':
      return 7 * 24 * 60 * 60 * 1000;
    case '90d':
      return 90 * 24 * 60 * 60 * 1000;
    default:
      return 30 * 24 * 60 * 60 * 1000;
  }
}
// start of day
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Đọc cache stats hoặc tính mới rồi ghi cache. */
async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit) as T;
  const data = await fn();
  await redis.setex(key, STATS_TTL_SEC, JSON.stringify(data));
  return data;
}

/** Tổng quan KPI dashboard admin. */
export async function getStatsOverview(range = '30d'): Promise<{
  data: AdminStatsOverviewDto;
  meta: AdminStatsMeta;
}> {
  const data = await cached(`stats:overview:${range}`, async () => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersToday,
      dauRows,
      wauRows,
      mauRows,
      postsToday,
      pendingReports,
      totalReports,
      resolvedReports,
      rejectedReports,
      actionTakenReports,
      activeHashtags,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, createdAt: { gte: todayStart } } }),
      prisma.session.findMany({
        where: { updatedAt: { gte: dayAgo } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      prisma.session.findMany({
        where: { updatedAt: { gte: weekAgo } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      prisma.session.findMany({
        where: { updatedAt: { gte: monthAgo } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      prisma.post.count({
        where: { deletedAt: null, parentId: null, createdAt: { gte: todayStart } },
      }),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.report.count(),
      prisma.report.count({ where: { status: 'RESOLVED' } }),
      prisma.report.count({ where: { status: 'REJECTED' } }),
      prisma.report.count({ where: { status: 'ACTION_TAKEN' } }),
      prisma.hashtag.count({ where: { status: 'ACTIVE' } }),
    ]);

    const reportResolutionRate =
      totalReports === 0
        ? 0
        : Math.round(((resolvedReports + actionTakenReports) / totalReports) * 100);

    return {
      totalUsers,
      newUsersToday,
      dau: dauRows.length,
      wau: wauRows.length,
      mau: mauRows.length,
      postsToday,
      pendingReports,
      reportResolutionRate,
      activeHashtags,
      reportStatusBreakdown: {
        pending: pendingReports,
        resolved: resolvedReports,
        rejected: rejectedReports,
        actionTaken: actionTakenReports,
      },
    };
  });

  return {
    data,
    meta: { cachedAt: new Date().toISOString(), range },
  };
}

/** Số bài gốc theo ngày trong khoảng thời gian. */
export async function getPostsPerDay(range = '30d'): Promise<AdminPostsPerDayDto[]> {
  return cached(`stats:posts-per-day:${range}`, async () => {
    const ms = rangeToMs(range);
    const from = new Date(Date.now() - ms);
    const rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
      FROM posts
      WHERE "deletedAt" IS NULL AND "parentId" IS NULL AND "createdAt" >= ${from}
      GROUP BY day
      ORDER BY day ASC
    `;
    return rows.map((r) => ({
      date: r.day.toISOString().slice(0, 10),
      count: Number(r.count),
    }));
  });
}

/** DAU theo ngày (session.updatedAt). */
export async function getActiveUsersPerDay(range = '30d'): Promise<AdminActiveUsersDto[]> {
  return cached(`stats:active-users:${range}`, async () => {
    const ms = rangeToMs(range);
    const from = new Date(Date.now() - ms);
    const rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', "updatedAt") AS day, COUNT(DISTINCT "userId")::bigint AS count
      FROM session
      WHERE "updatedAt" >= ${from}
      GROUP BY day
      ORDER BY day ASC
    `;
    return rows.map((r) => ({
      date: r.day.toISOString().slice(0, 10),
      count: Number(r.count),
    }));
  });
}

/** Top hashtag — ưu tiên đọc cache worker, fallback query DB. */
export async function getTopHashtags(range = '7d', limit = 10): Promise<AdminTopHashtagDto[]> {
  const cacheKey = `stats:top-hashtags:${range}`;
  const hit = await redis.get(cacheKey);
  if (hit) {
    const all = JSON.parse(hit) as AdminTopHashtagDto[];
    return all.slice(0, limit);
  }

  const ms =
    range === '24h'
      ? 24 * 60 * 60 * 1000
      : range === '30d'
        ? 30 * 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;
  const from = new Date(Date.now() - ms);
  const rows = await prisma.postHashtag.groupBy({
    by: ['hashtagId'],
    where: { post: { createdAt: { gte: from }, deletedAt: null } },
    _count: { postId: true },
    orderBy: { _count: { postId: 'desc' } },
    take: limit,
  });

  const tags = await prisma.hashtag.findMany({
    where: { id: { in: rows.map((r) => r.hashtagId) }, status: { not: 'BLOCKED' } },
    select: { id: true, tag: true },
  });
  const tagMap = new Map(tags.map((t) => [t.id, t.tag]));

  return rows
    .filter((r) => tagMap.has(r.hashtagId))
    .map((r) => ({
      tag: tagMap.get(r.hashtagId)!,
      count: r._count.postId,
      growthPct: 0,
    }));
}

/** Worker: tính trending hashtag và ghi Redis. */
export async function computeTrendingHashtags(): Promise<void> {
  for (const range of ['24h', '7d', '30d'] as const) {
    const data = await getTopHashtags(range, 50);
    await redis.setex(`stats:top-hashtags:${range}`, STATS_TTL_SEC, JSON.stringify(data));
  }
}

/** Xóa toàn bộ cache stats để request kế tiếp tính lại từ DB. */
export async function invalidateStatsCache(): Promise<void> {
  const prefixes = [
    'stats:overview',
    'stats:posts-per-day',
    'stats:active-users',
    'stats:top-hashtags',
  ];
  const keys = prefixes.flatMap((p) => STATS_RANGES.map((r) => `${p}:${r}`));
  await redis.del(...keys);
}
