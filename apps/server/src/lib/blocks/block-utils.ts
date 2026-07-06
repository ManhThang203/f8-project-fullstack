import { prisma } from '@costy/db';

import { AppError } from '../errors.js';

/** Lấy tập userId bị chặn hoặc chặn mình (hai chiều). */
export async function getBlockedRelatedUserIds(userId: string): Promise<string[]> {
  const rows = await prisma.userBlock.findMany({
    where: {
      OR: [{ blockerId: userId }, { blockedId: userId }],
    },
    select: { blockerId: true, blockedId: true },
  });

  const ids = new Set<string>();
  for (const row of rows) {
    if (row.blockerId === userId) ids.add(row.blockedId);
    if (row.blockedId === userId) ids.add(row.blockerId);
  }
  return [...ids];
}

/** Kiểm tra hai user có chặn nhau (một chiều hoặc hai chiều) không. */
export async function areUsersBlocked(userA: string, userB: string): Promise<boolean> {
  // Nếu hai user giống nhau thì không chặn nhau
  if (userA === userB) return false;
  // Kiểm tra xem userA có chặn userB không
  const row = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: userA, blockedId: userB },
        { blockerId: userB, blockedId: userA },
      ],
    },
    select: { id: true },
  });
  return Boolean(row);
}

/** Ném lỗi nếu viewer và target đang chặn nhau. */
export async function assertUsersNotBlocked(viewerId: string, targetId: string): Promise<void> {
  if (viewerId === targetId) return;
  const blocked = await areUsersBlocked(viewerId, targetId);
  if (blocked) {
    throw AppError.forbidden('Không thể tương tác với người dùng này');
  }
}

/**
 * Prisma filter loại các user bị chặn khỏi danh sách.
 * `field` chọn cột so khớp: 'id' cho bảng user, 'authorId' cho bảng post.
 * Trả object rỗng khi không có id nào cần loại (no-op filter).
 */
export function blockedUsersWhere(
  blockedIds: string[],
  field: 'id' | 'authorId' = 'id',
): Record<string, { notIn: string[] }> {
  if (blockedIds.length === 0) return {};
  return { [field]: { notIn: blockedIds } };
}
