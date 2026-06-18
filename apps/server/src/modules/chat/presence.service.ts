import { prisma } from '@costy/db';

import { redis } from '../../lib/redis.js';

const ONLINE_TTL = 90; // seconds
const keyOnline = (id: string) => `presence:online:${id}`;
const keyLastSeen = (id: string) => `presence:lastSeen:${id}`;

/** Đánh dấu user online trên Redis (TTL 90s) và cập nhật lastSeen cache. */
export async function setOnline(userId: string): Promise<void> {
  const now = new Date().toISOString();
  await redis.set(keyOnline(userId), '1', 'EX', ONLINE_TTL);
  await redis.set(keyLastSeen(userId), now);
}

/** Gia hạn heartbeat online — client gửi mỗi ~30s khi tab chat còn mở. */
export async function refreshHeartbeat(userId: string): Promise<void> {
  const now = new Date().toISOString();
  await redis.expire(keyOnline(userId), ONLINE_TTL);
  await redis.set(keyLastSeen(userId), now);
}

/** Đánh dấu offline: xóa key online, persist lastSeenAt vào PostgreSQL. */
export async function setOffline(userId: string): Promise<void> {
  const now = new Date();
  await redis.del(keyOnline(userId));
  await redis.set(keyLastSeen(userId), now.toISOString());

  await prisma.user.update({
    where: { id: userId },
    data: { lastSeenAt: now },
  });
}

/** Lấy isOnline + lastSeenAt hàng loạt từ Redis, fallback DB khi cache thiếu. */
export async function getPresence(
  userIds: string[],
): Promise<Map<string, { isOnline: boolean; lastSeenAt: string | null }>> {
  const result = new Map<string, { isOnline: boolean; lastSeenAt: string | null }>();
  if (userIds.length === 0) return result;

  const pipeline = redis.pipeline();
  for (const id of userIds) {
    pipeline.get(keyOnline(id));
    pipeline.get(keyLastSeen(id));
  }

  const replies = await pipeline.exec();
  const missingIds: string[] = [];

  for (let i = 0; i < userIds.length; i++) {
    const id = userIds[i]!;
    const onlineVal = replies?.[i * 2]?.[1];
    const lastSeenVal = replies?.[i * 2 + 1]?.[1];

    const isOnline = onlineVal === '1';
    const lastSeenAt = typeof lastSeenVal === 'string' ? lastSeenVal : null;

    result.set(id, { isOnline, lastSeenAt });

    if (!isOnline && !lastSeenAt) {
      missingIds.push(id);
    }
  }

  if (missingIds.length > 0) {
    const dbUsers = await prisma.user.findMany({
      where: { id: { in: missingIds } },
      select: { id: true, lastSeenAt: true },
    });

    for (const u of dbUsers) {
      const existing = result.get(u.id);
      result.set(u.id, {
        isOnline: existing?.isOnline ?? false,
        lastSeenAt: u.lastSeenAt ? u.lastSeenAt.toISOString() : null,
      });
    }
  }

  return result;
}
