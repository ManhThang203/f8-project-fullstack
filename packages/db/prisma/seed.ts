import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const prismaDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(prismaDir, '../../..');
dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config({ path: path.join(repoRoot, '.env.local') });

const { prisma } = await import('../src/index.js');

/** Stable id referenced by `NEXT_PUBLIC_DEMO_USER_ID` for dev header (user row only; login qua Better Auth = đăng ký hoặc tạo Account). */
const DEMO_USER_ID = 'seed_demo_user_001';

async function main() {
  await prisma.user.upsert({
    where: { username: 'demo' },
    create: {
      id: DEMO_USER_ID,
      username: 'demo',
      name: 'Người dùng demo',
      email: 'demo@threads.local',
    },
    update: { name: 'Người dùng demo' },
  });

  const existing = await prisma.post.count({
    where: { authorId: DEMO_USER_ID, parentId: null, deletedAt: null },
  });

  if (existing === 0) {
    await prisma.post.createMany({
      data: [
        {
          authorId: DEMO_USER_ID,
          content: 'Chào mừng đến Threads Clone — đây là bài đăng seed đầu tiên.',
        },
        {
          authorId: DEMO_USER_ID,
          content: 'Đăng ký tài khoản (Better Auth) hoặc dùng header dev với user seed.',
        },
      ],
    });
  }
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
