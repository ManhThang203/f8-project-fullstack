import { prisma } from '@costy/db';
import type { BlockedUserDto } from '@costy/shared';

import { createdCursorOrderBy, createdCursorWhere, encodeCreatedCursor } from '../../lib/admin/cursor.js';
import { AppError } from '../../lib/errors.js';
import { refreshBlocksForUsers } from '../../socket/chat.namespace.js';

/** Danh sách user mà mình đã chặn, phân trang cursor ghép (createdAt, id) để không lệch trang khi trùng thời điểm. */
export async function listBlockedUsers(
  userId: string,
  limit = 20,
  cursor?: string,
): Promise<{ items: BlockedUserDto[]; nextCursor: string | null }> {
  const rows = await prisma.userBlock.findMany({
    where: { blockerId: userId, ...createdCursorWhere(cursor) },
    take: limit + 1,
    orderBy: createdCursorOrderBy,
    include: {
      blocked: {
        select: { id: true, username: true, name: true, image: true, deletedAt: true },
      },
    },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const items: BlockedUserDto[] = page
    .filter((row) => row.blocked.deletedAt === null)
    .map((row) => ({
      id: row.blocked.id,
      username: row.blocked.username,
      name: row.blocked.name,
      image: row.blocked.image,
      blockedAt: row.createdAt.toISOString(),
    }));

  const nextCursor = hasMore && page.length > 0 ? encodeCreatedCursor(page[page.length - 1]!) : null;
  return { items, nextCursor };
}

/** Chặn một user: xoá follow hai chiều và huỷ lời mời kết bạn. */
export async function blockUser(blockerId: string, blockedId: string): Promise<{ ok: true }> {
  if (blockerId === blockedId) {
    throw AppError.badRequest('Không thể chặn chính mình');
  }

  const target = await prisma.user.findFirst({
    where: { id: blockedId, deletedAt: null },
    select: { id: true },
  });
  if (!target) throw AppError.notFound('Không tìm thấy người dùng này');

  await prisma.$transaction([
    prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    }),
    prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: blockerId, followingId: blockedId },
          { followerId: blockedId, followingId: blockerId },
        ],
      },
    }),
    prisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: blockerId, addresseeId: blockedId },
          { requesterId: blockedId, addresseeId: blockerId },
        ],
      },
    }),
  ]);

  refreshBlocksForUsers([blockerId, blockedId]);
  return { ok: true };
}

/** Bỏ chặn user. */
export async function unblockUser(blockerId: string, blockedId: string): Promise<{ ok: true }> {
  await prisma.userBlock.deleteMany({
    where: { blockerId, blockedId },
  });
  refreshBlocksForUsers([blockerId, blockedId]);
  return { ok: true };
}
