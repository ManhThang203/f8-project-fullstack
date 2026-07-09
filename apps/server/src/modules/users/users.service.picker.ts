/**
 * Picker service: cung cấp danh sách user gợi ý cho composer/share/tạo nhóm.
 */

import { prisma } from '@costy/db';

import { blockedUsersWhere, getBlockedRelatedUserIds } from '../../lib/blocks/block-utils.js';

/**
 * Tìm kiếm user theo username hoặc name (case-insensitive).
 * Loại chính viewer khỏi kết quả; trả tối đa 60 kết quả sắp xếp theo username.
 */
export async function listUsersForPicker(viewerId: string, q?: string) {
  const needle = q?.trim();
  const blockedIds = await getBlockedRelatedUserIds(viewerId);
  const excludeIds = [viewerId, ...blockedIds];
  return prisma.user.findMany({
    where: {
      deletedAt: null,
      ...blockedUsersWhere(excludeIds),
      ...(needle
        ? {
            OR: [
              { username: { contains: needle, mode: 'insensitive' } },
              { name: { contains: needle, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    take: 60,
    orderBy: { username: 'asc' },
    select: { id: true, username: true, name: true, image: true },
  });
}
