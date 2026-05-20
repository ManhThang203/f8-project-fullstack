import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const prismaDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(prismaDir, '../../..');
dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config({ path: path.join(repoRoot, '.env.local') });

const { prisma } = await import('../src/index.js');

/** Stable id referenced by `NEXT_PUBLIC_DEMO_USER_ID` for dev header. */
const DEMO_USER_ID = 'seed_demo_user_001';

/** Số bài gốc (parentId = null) để test cuộn feed + cursor pagination (limit mặc định 20 → ~5 trang). */
const SEED_ROOT_POST_COUNT = 100;

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

  // Xóa bài cũ của demo (chỉ bài gốc) để mỗi lần seed có đúng 100 bài, thứ tự createdAt ổn định.
  const deleted = await prisma.post.deleteMany({
    where: { authorId: DEMO_USER_ID, parentId: null },
  });

  const now = Date.now();
  const posts = Array.from({ length: SEED_ROOT_POST_COUNT }, (_, i) => ({
    authorId: DEMO_USER_ID,
    content: `Bài seed ${i + 1}/${SEED_ROOT_POST_COUNT} — test cuộn feed và phân trang (cursor).`,
    // i = 0 mới nhất; cách nhau 1 phút để sort createdAt desc rõ ràng.
    createdAt: new Date(now - i * 60_000),
  }));

  const created = await prisma.post.createMany({ data: posts });

  // eslint-disable-next-line no-console
  console.log(
    `[seed] user demo ok | removed ${deleted.count} old root posts | created ${created.count} posts`,
  );
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
