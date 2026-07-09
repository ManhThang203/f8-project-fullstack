import type { PrismaClient } from '../generated/prisma/client.js';

export const SEED_BLOCKED_USER_COUNT = 25;

const BLOCKED_USER_NAMES = [
  'Nguyễn Văn An',
  'Trần Thị Bình',
  'Lê Minh Châu',
  'Phạm Hoàng Dũng',
  'Hoàng Thị Em',
  'Vũ Quốc Giang',
  'Đặng Thu Hà',
  'Bùi Văn Khánh',
  'Đỗ Thị Lan',
  'Ngô Minh Phúc',
  'Lý Thanh Quân',
  'Mai Thu Trang',
  'Võ Đức Vinh',
  'Phan Thị Xuân',
  'Trương Minh Yến',
  'Cao Văn Bảo',
  'Đinh Thị Chi',
  'Hồ Quang Đạt',
  'Lương Thị Hương',
  'Nguyễn Anh Kiệt',
];

type BlockedUserSeed = {
  id: string;
  username: string;
  email: string;
  name: string;
};

/** Tạo 25 user seed riêng để test danh sách đã chặn. */
function buildBlockedUserSeeds(): BlockedUserSeed[] {
  return Array.from({ length: SEED_BLOCKED_USER_COUNT }, (_, index) => {
    const n = index + 1;
    const padded = String(n).padStart(3, '0');

    return {
      id: `seed_blocked_user_${padded}`,
      username: `seedblocked${padded}`,
      email: `seedblocked${padded}@costy.local`,
      name: BLOCKED_USER_NAMES[index % BLOCKED_USER_NAMES.length]!,
    };
  });
}

/** Seed 25 user bị chặn bởi một tài khoản (idempotent theo prefix seedblocked). */
export async function seedBlockedUsersForUser(
  prisma: PrismaClient,
  blockerUserId: string,
): Promise<{ users: number; removed: number; created: number }> {
  const users = buildBlockedUserSeeds();

  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      create: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: 'USER',
      },
      update: {
        name: user.name,
        email: user.email,
      },
    });
  }

  const blockedUserIds = users.map((user) => user.id);
  const removed = await prisma.userBlock.deleteMany({
    where: {
      blockerId: blockerUserId,
      blockedId: { in: blockedUserIds },
    },
  });

  const now = Date.now();
  const minuteMs = 60_000;
  const blocks = users.map((user, index) => ({
    blockerId: blockerUserId,
    blockedId: user.id,
    createdAt: new Date(now - index * minuteMs),
  }));

  const created = await prisma.userBlock.createMany({ data: blocks });

  return {
    users: users.length,
    removed: removed.count,
    created: created.count,
  };
}
