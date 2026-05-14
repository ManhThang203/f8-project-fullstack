import { prisma } from '@threads/db';

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
