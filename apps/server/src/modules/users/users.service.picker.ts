/**
 * Picker service: cung cấp danh sách user gợi ý cho composer/share/tạo nhóm.
 */

import { prisma } from '@threads/db';

/**
 * Tìm kiếm user theo username hoặc name (case-insensitive).
 * Loại chính viewer khỏi kết quả; trả tối đa 60 kết quả sắp xếp theo username.
 */
export async function listUsersForPicker(viewerId: string, q?: string) {
  const needle = q?.trim();
  return prisma.user.findMany({
    where: {
      deletedAt: null,
      id: { not: viewerId },
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
